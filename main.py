"""
main.py — Mnemos FastAPI Backend
==================================
14 routes + CORS + cognee integration + startup agent loop.
"""

import os
# Must be set before ANY protobuf/gRPC/gemini import to suppress
# C-extension filesystem-scanning noise ("Cannot read ...png").
os.environ.setdefault("GRPC_VERBOSITY", "NONE")
os.environ.setdefault("GRPC_TRACE", "")
os.environ.setdefault("PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION", "python")

import io
import csv
import asyncio
import traceback
import httpx
from datetime import datetime, timezone
from dataclasses import asdict
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from demo_gate import require_write_access
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from erp_schema import (
    classify_erp_event,
    compute_relationship_state,
    to_cognee_metadata,
)
from fast_import_csv import classify_without_ai
from entropy_engine import validate_date_str   # #5: loud date validation

import storage
import entropy_engine
import agent_loop
from ai_client import call_ai_with_fallback, get_ai_status
from conflict_detector import check_for_conflict

# ─── Cognee Cloud Pro API ─────────────────────────────────────────────────────
COGNEE_API_BASE  = os.environ.get("COGNEE_API_BASE") or os.environ.get("COGNEE_BASE_URL", "https://api.cognee.ai")
COGNEE_API_KEY   = os.environ.get("COGNEE_API_KEY", "")
COGNEE_TENANT_ID = os.environ.get("COGNEE_TENANT_ID", "")
COGNEE_AVAILABLE = bool(COGNEE_API_KEY)

if not COGNEE_AVAILABLE:
    print("[mnemos] WARNING: COGNEE_API_KEY not set. Cognee Cloud semantic search disabled.")
else:
    print(f"[mnemos] Cognee Cloud Pro configured at {COGNEE_API_BASE}")

# #3 FIX: max events passed to Gemini fallback prompt



async def _cognee_request(method: str, path: str, timeout: float = 20.0, **kwargs) -> dict | list | None:
    """Make an authenticated request to the Cognee Cloud Pro API."""
    url = f"{COGNEE_API_BASE}/api/v1{path}"
    headers = {
        "X-Api-Key": COGNEE_API_KEY,
        "X-Tenant-Id": COGNEE_TENANT_ID,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.request(method, url, headers=headers, **kwargs)
        resp.raise_for_status()
        if resp.status_code == 204:
            return None
        return resp.json()


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    agent_loop.start_agent(interval_seconds=60)
    print("[mnemos] Backend started. Agent loop running.")
    yield
    agent_loop.stop_agent()
    print("[mnemos] Backend shut down.")


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Mnemos",
    description="Proactive Relationship Intelligence Agent for ERP",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────────────

class IngestRequest(BaseModel):
    text: str
    entity_id: str
    entity_type: str = "Customer"
    date: Optional[str] = None

class IngestResponse(BaseModel):
    status: str
    entity_id: str
    event_type: str
    sentiment: str
    sentiment_intensity: float
    promises_found: int
    relationship_state: str
    erp_tags: list[str]
    relationship_signals: list[str]
    cognee_status: str

class QueryRequest(BaseModel):
    entity_id: str
    query: str

class QueryResponse(BaseModel):
    entity_id: str
    query: str
    answer: str
    events_searched: int
    search_mode: str


# ─── Route 0: GET / ───────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Root endpoint to verify the API is running."""
    return {
        "message": "Mnemos ERP Relationship Intelligence API is running.",
        "endpoints": ["/health", "/entities", "/alerts", "/customer/{id}/timeline", "/customer/{id}/commitments"]
    }


# ─── Route 1: POST /ingest ────────────────────────────────────────────────────

@app.post("/ingest", response_model=IngestResponse)
async def ingest_event(req: IngestRequest, _=Depends(require_write_access)):
    """
    Ingest a raw interaction note.
    1. Validate date if provided (#5 fix — 422 on bad date)
    2. Classify via Gemini
    3. Store to SQLite
    4. Queue Cognee upload; enqueue retry on failure (#4 fix)
    """
    # #5 FIX: validate date before doing any work
    if req.date:
        try:
            validate_date_str(req.date, field_name="date")
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    # 1. Extract structured event via Gemini
    event = classify_erp_event(
        text=req.text,
        entity_id=req.entity_id,
        entity_type=req.entity_type,
    )
    if req.date:
        event.extracted_at = req.date

    # 2. Store to SQLite (always first — local storage is source of truth)
    event_id = storage.save_event(event)

    # 2.5 Check for conflicts
    if event.attribute_type and event.attribute_value:
        check_for_conflict(
            req.entity_id, 
            event.attribute_type, 
            event.attribute_value, 
            event.attribute_source or "interaction note", 
            event_id
        )

    # 3. Ingest into Cognee Cloud
    cognee_status = "skipped"
    if COGNEE_AVAILABLE:
        try:
            await _cognee_request("POST", "/add", json={
                "data": req.text,
                "dataset_name": req.entity_id,
            })
            await _cognee_request("POST", "/cognify", json={"datasets": [req.entity_id]})
            cognee_status = "indexed"
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 409:
                # Dataset already exists — data was still added, not an error
                cognee_status = "indexed"
                print(f"[mnemos] Cognee dataset already exists for {req.entity_id}, data added.")
            else:
                storage.queue_cognee_retry(req.entity_id, req.text)
                cognee_status = f"queued_retry: {str(e)[:80]}"
                print(f"[mnemos] Cognee upload failed for {req.entity_id}, queued retry: {e}")
        except Exception as e:
            storage.queue_cognee_retry(req.entity_id, req.text)
            cognee_status = f"queued_retry: {str(e)[:80]}"
            print(f"[mnemos] Cognee upload failed for {req.entity_id}, queued retry: {e}")

    # 4. Compute current relationship state
    all_events = storage.get_events(req.entity_id)
    state = compute_relationship_state(all_events)

    return IngestResponse(
        status="ingested",
        entity_id=req.entity_id,
        event_type=event.event_type,
        sentiment=event.sentiment,
        sentiment_intensity=event.sentiment_intensity,
        promises_found=len(event.promises),
        relationship_state=state.value,
        erp_tags=event.erp_tags,
        relationship_signals=event.relationship_signals,
        cognee_status=cognee_status,
    )


# ─── Route 2: POST /query ─────────────────────────────────────────────────────

def _extract_cognee_answer(results: list) -> str | None:
    """Extract and validate Cognee search results."""
    answer_parts = []
    for r in results:
        if isinstance(r, dict) and "search_result" in r:
            sr = r["search_result"]
            if isinstance(sr, list):
                answer_parts.extend(str(item) for item in sr)
            else:
                answer_parts.append(str(sr))
        elif isinstance(r, dict) and "text" in r:
            answer_parts.append(r["text"])
        elif isinstance(r, dict) and "content" in r:
            answer_parts.append(r["content"])
        elif isinstance(r, dict) and "chunk_text" in r:
            answer_parts.append(r["chunk_text"])
        elif isinstance(r, str):
            answer_parts.append(r)
        else:
            answer_parts.append(str(r))

    clean_answer = "\n".join(answer_parts).strip()
    if not clean_answer:
        return None

    # Filter only truly unhelpful responses (clarifying questions, broken responses)
    unhelpful_markers = [
        "node1", "triples you", "do you need details",
        "could you please provide", "which contract or service",
        "please share", "can you provide", "what specific",
        "i can't determine", "i cannot determine",
        "without the knowledge-graph", "please provide the list",
    ]
    lower_answer = clean_answer.lower()
    if any(marker in lower_answer for marker in unhelpful_markers):
        return None

    return clean_answer


async def _search_cognee(qtype: str, entity_id: str, query: str, timeout: float = 15.0, system_prompt: str = None) -> tuple[str, str] | None:
    """Search Cognee with a single query type. Returns (qtype, answer) or None."""
    try:
        body = {
            "query": query,
            "query_type": qtype,
            "dataset_name": entity_id,
        }
        if system_prompt:
            body["system_prompt"] = system_prompt
        results = await _cognee_request("POST", "/search", timeout=timeout, json=body)
        if not results:
            return None
        answer = _extract_cognee_answer(results)
        if answer:
            print(f"[mnemos] Cognee {qtype} returned result ({len(answer)} chars)")
            return (qtype, answer)
        print(f"[mnemos] Cognee {qtype} returned unhelpful result")
    except httpx.TimeoutException:
        print(f"[mnemos] Cognee {qtype} timed out after {timeout}s")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            print(f"[mnemos] Cognee {qtype}: no dataset for {entity_id}")
        else:
            print(f"[mnemos] Cognee {qtype} HTTP error: {e.response.status_code}")
    except Exception as e:
        print(f"[mnemos] Cognee {qtype} search failed: {e}")
    return None


@app.post("/query", response_model=QueryResponse)
async def query_entity(req: QueryRequest):
    """
    Natural language query over an entity's interaction history.

    Strategy (Cognee-only, no LLM fallback):
      1. GRAPH_COMPLETION with 35s timeout (relationship-aware + system_prompt).
      2. INSIGHTS + CHUNKS parallel fallback (25s each) if phase 1 fails.
      3. 404 if all Cognee types fail.
    """
    try:
        return await _query_entity_impl(req)
    except Exception:
        traceback.print_exc()
        raise


async def _query_entity_impl(req: QueryRequest):
    events = storage.get_events(req.entity_id)
    if not events:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for entity '{req.entity_id}'"
        )

    if COGNEE_AVAILABLE:
        RELATIONSHIP_PROMPT = (
            "You are a relationship analyst for an ERP CRM system. "
            "Given the user's question, search the knowledge graph for entities, "
            "relationships, and connections between them. "
            "Focus on describing relationship dynamics, patterns across interactions, "
            "entity connections, and any triples that reveal how entities relate. "
            "Return a concise natural-language answer emphasizing relationship insights."
        )
        # ── Phase 1: Try all 3 Cognee search types in parallel (5s timeout) ──
        cognee_tasks = [
            asyncio.create_task(_search_cognee("GRAPH_COMPLETION", req.entity_id, req.query,
                                               timeout=5, system_prompt=RELATIONSHIP_PROMPT)),
            asyncio.create_task(_search_cognee("INSIGHTS", req.entity_id, req.query, timeout=5)),
            asyncio.create_task(_search_cognee("CHUNKS", req.entity_id, req.query, timeout=5)),
        ]
        try:
            done, pending = await asyncio.wait(cognee_tasks, timeout=6,
                                                return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                try:
                    result = task.result()
                    if result:
                        qtype, answer = result
                        for t in pending:
                            t.cancel()
                        return QueryResponse(
                            entity_id=req.entity_id,
                            query=req.query,
                            answer=answer,
                            events_searched=len(events),
                            search_mode=f"cognee_{qtype.lower()}",
                        )
                except Exception:
                    continue
            for t in pending:
                t.cancel()
        except Exception as e:
            print(f"[mnemos] Cognee search error: {e}")

    print(f"[mnemos] Cognee failed or is not available. Falling back to local LLM for {req.entity_id}")

    # ── Phase 3: Local LLM fallback (using sliding window of last 20 events) ──
    recent_events = events[-20:]
    history_lines = []
    for e in recent_events:
        promises_str = ""
        if e.promises:
            promises_list = []
            for p in e.promises:
                status = "resolved" if p.resolved else "unresolved"
                due = f", due {p.due_date}" if p.due_date else ""
                promises_list.append(f"- Promise: {p.description} (by {p.made_by}, {status}{due})")
            promises_str = "\n" + "\n".join(promises_list)
            
        history_lines.append(
            f"Date: {e.extracted_at}\n"
            f"Type: {e.event_type}\n"
            f"Sentiment: {e.sentiment} (intensity: {e.sentiment_intensity:.2f})\n"
            f"Note: {e.raw_text}"
            f"{promises_str}"
        )
    history_text = "\n\n".join(history_lines)
    
    fallback_prompt = (
        "You are a relationship analyst for an ERP CRM system.\n"
        f"Analyze the following recent interaction history for entity '{req.entity_id}' "
        "and answer the user's question.\n\n"
        f"Interaction History:\n{history_text}\n\n"
        f"User's Question: {req.query}\n\n"
        "Return a concise, direct, and professional answer based strictly on the provided interaction history. "
        "If the answer cannot be found in the history, say so politely."
    )
    
    try:
        answer = await asyncio.to_thread(call_ai_with_fallback, fallback_prompt)
        if answer:
            return QueryResponse(
                entity_id=req.entity_id,
                query=req.query,
                answer=answer,
                events_searched=len(events),
                search_mode="llm_fallback",
            )
    except Exception as e:
        print(f"[mnemos] Local LLM fallback failed: {e}")
        
    raise HTTPException(
        status_code=404,
        detail=f"Could not answer for '{req.entity_id}'. Try rephrasing your question."
    )


# ─── Route: POST /query-cross-entity ─────────────────────────────────────────

class CrossEntityQueryRequest(BaseModel):
    query: str
    entity_ids: Optional[list[str]] = None

class CrossEntityQueryResponse(BaseModel):
    query: str
    answer: str
    entities_searched: list[str]
    search_mode: str

@app.post("/query-cross-entity", response_model=CrossEntityQueryResponse)
async def query_cross_entity(req: CrossEntityQueryRequest):
    if req.entity_ids:
        target_ids = req.entity_ids
    else:
        all_entities = storage.list_entities()
        target_ids = [e["entity_id"] for e in all_entities]

    MAX_ENTITIES = 15
    target_ids = target_ids[:MAX_ENTITIES]

    if not target_ids:
        raise HTTPException(status_code=404, detail="No entities found to search across")

    RELATIONSHIP_PROMPT = (
        "You are a relationship analyst for an ERP CRM system. "
        "Given the user's question, search the knowledge graph for entities, "
        "relationships, and connections between them. "
        "Focus on describing relationship dynamics, patterns across interactions, "
        "entity connections, and any triples that reveal how entities relate. "
        "Return a concise natural-language answer emphasizing relationship insights."
    )

    if COGNEE_AVAILABLE:
        async def _try_search(qtype, extra):
            body = {"query": req.query, "query_type": qtype, "datasets": target_ids}
            body.update(extra)
            return await _cognee_request("POST", "/search", json=body, timeout=8)

        cross_tasks = [
            asyncio.create_task(_try_search("GRAPH_COMPLETION", {"system_prompt": RELATIONSHIP_PROMPT})),
            asyncio.create_task(_try_search("INSIGHTS", {})),
            asyncio.create_task(_try_search("CHUNKS", {})),
        ]
        try:
            done, pending = await asyncio.wait(cross_tasks, timeout=10,
                                                return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                try:
                    results = task.result()
                    clean_answer = _extract_cognee_answer(results)
                    if clean_answer:
                        for t in pending:
                            t.cancel()
                        # determine which qtype this task was
                        return CrossEntityQueryResponse(
                            query=req.query,
                            answer=clean_answer,
                            entities_searched=target_ids,
                            search_mode="cognee_cross_entity",
                        )
                except Exception:
                    continue
            for t in pending:
                t.cancel()
        except Exception as e:
            print(f"[mnemos] cross-entity search error: {e}")

    # ── Local data overview (when Cognee is unavailable) ─────────────────────
    all_entities_data = storage.list_entities()
    all_alerts = agent_loop.get_latest_alerts()
    if not all_alerts:
        all_alerts = entropy_engine.get_all_alerts(min_severity="medium")

    at_risk_count = sum(1 for e in all_entities_data if e.get("state") == "AT_RISK")
    churned_count = sum(1 for e in all_entities_data if e.get("state") == "CHURNED")
    engaged_count = sum(1 for e in all_entities_data if e.get("state") == "ENGAGED")
    total_promises = sum(e.get("open_promises", 0) for e in all_entities_data)
    critical_alerts = sum(1 for a in all_alerts if getattr(a, "severity", "") == "critical") if all_alerts else 0

    answer = (
        f"**System Overview (Cognee unavailable — showing local data)**\n\n"
        f"I found **{len(all_entities_data)} entities** across **{engaged_count} engaged**, "
        f"**{at_risk_count} at risk**, and **{churned_count} churned**.\n\n"
        f"**{total_promises} open promises** tracked.\n"
        f"**{len(all_alerts)} active alerts** (**: {critical_alerts} critical**).\n\n"
        f"Your query could not be answered from Cognee's knowledge graph. "
        f"Try rephrasing, or ask about specific entities with /query."
    )

    return CrossEntityQueryResponse(
        query=req.query,
        answer=answer,
        entities_searched=target_ids,
        search_mode="local_overview",
    )


# ─── Route 3: GET /customer/{id}/timeline ─────────────────────────────────────

@app.get("/customer/{entity_id}/timeline")
async def get_timeline(entity_id: str):
    """Returns all events for an entity, chronologically ordered."""
    events = storage.get_events(entity_id)
    if not events:
        raise HTTPException(status_code=404, detail=f"No data found for entity '{entity_id}'")

    state = compute_relationship_state(events)
    timeline = [
        {
            "timestamp": e.extracted_at,
            "event_type": e.event_type,
            "sentiment": e.sentiment,
            "sentiment_intensity": e.sentiment_intensity,
            "raw_text": e.raw_text,
            "erp_tags": e.erp_tags,
            "relationship_signals": e.relationship_signals,
            "entities_mentioned": e.entities_mentioned,
            "promises": [
                {
                    "description": p.description,
                    "promise_type": p.promise_type,
                    "made_by": p.made_by,
                    "due_date": p.due_date,
                    "urgency_weight": p.urgency_weight,
                    "resolved": p.resolved,
                }
                for p in e.promises
            ],
        }
        for e in events
    ]

    return {
        "entity_id": entity_id,
        "entity_type": events[0].entity_type if events else "Customer",
        "relationship_state": state.value,
        "event_count": len(events),
        "timeline": timeline,
    }


# ─── Route 4: GET /customer/{id}/commitments ──────────────────────────────────

@app.get("/customer/{entity_id}/commitments")
async def get_commitments(entity_id: str):
    """Returns all promises for an entity with live entropy scores."""
    events = storage.get_events(entity_id)
    if not events:
        raise HTTPException(status_code=404, detail=f"No data found for entity '{entity_id}'")

    commitments = []
    for event in events:
        for promise in event.promises:
            try:
                entropy = entropy_engine.calculate_entropy(promise, event.extracted_at)
                severity = entropy_engine._severity_from_entropy(entropy)
            except ValueError as e:
                # #5 FIX: bad date on stored event — report it but don't crash
                entropy = -1.0
                severity = "unknown"
                print(f"[mnemos] Bad date on stored event for {entity_id}: {e}")

            commitments.append({
                "description": promise.description,
                "promise_type": promise.promise_type,
                "made_by": promise.made_by,
                "due_date": promise.due_date,
                "urgency_weight": promise.urgency_weight,
                "resolved": promise.resolved,
                "entropy_score": entropy,
                "severity": severity,
                "recorded_at": event.extracted_at,
            })

    commitments.sort(key=lambda c: (c["resolved"], -c["entropy_score"]))

    return {
        "entity_id": entity_id,
        "total_promises": len(commitments),
        "open_count": sum(1 for c in commitments if not c["resolved"]),
        "commitments": commitments,
    }


# ─── Route 5: GET /alerts ─────────────────────────────────────────────────────

@app.get("/alerts")
async def get_alerts():
    """Returns all active alerts from the proactive agent."""
    forgotten = storage.get_forgotten_entity_ids()

    alerts = agent_loop.get_latest_alerts()
    if not alerts:
        alerts = entropy_engine.get_all_alerts(min_severity="medium")
    alerts = [a for a in alerts if a.entity_id not in forgotten]

    alert_dicts = [asdict(a) for a in alerts]
    summary = entropy_engine.get_alert_summary()
    at_risk = [e for e in agent_loop.get_at_risk_entities() if e.get("entity_id") not in forgotten]
    status = agent_loop.get_agent_status()

    return {
        "alerts": alert_dicts,
        "summary": summary,
        "at_risk_entities": at_risk,
        "agent_status": status,
    }


# ─── Route 6: GET /conflicts ──────────────────────────────────────────────────

@app.get("/conflicts")
def list_conflicts():
    conflicts = storage.get_active_conflicts()
    return {"conflicts": conflicts}


# ─── Route 7: POST /draft-followup ────────────────────────────────────────────

@app.post("/draft-followup")
async def draft_followup(payload: dict):
    entity_id = payload.get("entity_id", "unknown")
    context = payload.get("context", "")
    prompt = f"""Write a short, professional follow-up message (2-3 sentences) to {entity_id} regarding: {context}. Keep it direct and polite, suitable for WhatsApp or email."""
    try:
        draft = call_ai_with_fallback(prompt)
        if isinstance(draft, dict):
            draft = draft.get("text", str(draft))
        return {"draft": str(draft)}
    except Exception as e:
        return {"draft": f"Dear {entity_id}, I wanted to follow up regarding {context[:100]}. Could we schedule a call to discuss this further? Best regards."}


# ─── Route 8: GET /entropy/live ───────────────────────────────────────────────

@app.get("/entropy/live")
def live_entropy():
    from entropy_engine import get_all_alerts
    try:
        alerts = get_all_alerts()
        entity_scores = {}
        for alert in alerts:
            eid = alert.entity_id if hasattr(alert, 'entity_id') else alert.get('entity_id', '')
            score = alert.entropy_score if hasattr(alert, 'entropy_score') else alert.get('entropy_score', 0)
            if eid not in entity_scores or score > entity_scores[eid]:
                entity_scores[eid] = score
        result = [
            {"entity_id": eid, "entity_name": eid.replace('_', ' ').title(), "entropy_score": round(score, 3)}
            for eid, score in sorted(entity_scores.items(), key=lambda x: x[1], reverse=True)[:4]
        ]
        return {"entities": result}
    except Exception as e:
        return {"entities": []}


# ─── Route 9: GET /entities ───────────────────────────────────────────────────

@app.get("/entities")
async def list_entities():
    """Returns all known entities with their current relationship state."""
    entities = storage.list_entities()
    return {"entities": entities, "total": len(entities)}


# ─── Route 7: POST /import-csv ────────────────────────────────────────────────

@app.post("/import-csv")
async def import_csv(file: UploadFile = File(...), _=Depends(require_write_access)):
    """
    Bulk import interactions from a CSV file.
    Expected columns: entity_id, entity_type, date, text

    #5 FIX: Rows with invalid dates are rejected with an error entry
             (not silently stored with a fake date).
    #4 FIX: Failed Cognee uploads are queued for retry.
    """
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    results = []
    row_num = 0

    for row in reader:
        row_num += 1
        entity_id  = row.get("entity_id", "").strip()
        entity_type = row.get("entity_type", "Customer").strip()
        text_val   = row.get("text", "").strip()
        date_str   = row.get("date", "").strip()

        if not entity_id or not text_val:
            results.append({"row": row_num, "status": "skipped", "reason": "Missing entity_id or text"})
            continue

        # #5 FIX: reject bad dates at ingest, don't store them
        if date_str:
            try:
                validate_date_str(date_str, field_name=f"row {row_num} date")
            except ValueError as e:
                results.append({"row": row_num, "status": "error", "error": str(e)})
                continue

        try:
            # Use fast AI-free classifier — avoids rate limits entirely
            event = classify_without_ai(
                text=text_val,
                entity_id=entity_id,
                entity_type=entity_type,
                date_str=date_str,
            )

            event_id = storage.save_event(event)

            if event.attribute_type and event.attribute_value:
                check_for_conflict(
                    entity_id,
                    event.attribute_type,
                    event.attribute_value,
                    event.attribute_source or "interaction note",
                    event_id,
                )

            results.append({
                "row": row_num,
                "status": "ingested",
                "entity_id": entity_id,
                "event_type": event.event_type,
                "promises_found": len(event.promises),
            })

        except Exception as e:
            results.append({"row": row_num, "status": "error", "error": str(e)})

    agent_loop.run_agent_scan()

    return {
        "total_rows": row_num,
        "imported": sum(1 for r in results if r.get("status") == "ingested"),
        "skipped":  sum(1 for r in results if r.get("status") == "skipped"),
        "errors":   sum(1 for r in results if r.get("status") == "error"),
        "results":  results,
    }


# ─── Route: POST /memify ──────────────────────────────────────────────────────

@app.post("/memify")
async def run_memify(_=Depends(require_write_access)):
    """
    Entropy-weighted pruning pass: soft-deletes low-signal events
    (neutral type, neutral sentiment, no promises) to keep working
    memory sharp. Reversible at the DB level (pruned=1, not deleted).
    Also triggers Cognee's own improve/memify pass on each affected
    entity to keep derived graph embeddings current.
    """
    nodes_before = storage.count_total_events(include_pruned=False)

    candidates = storage.find_low_signal_event_ids()
    ids_to_prune = [c[0] for c in candidates]
    storage.prune_events(ids_to_prune)

    nodes_after = storage.count_total_events(include_pruned=False)

    per_entity: dict[str, int] = {}
    for _id, entity_id in candidates:
        per_entity[entity_id] = per_entity.get(entity_id, 0) + 1

    cognee_enriched, cognee_failed = [], []
    if COGNEE_AVAILABLE:
        for entity_id in per_entity:
            try:
                await _cognee_request(
                    "POST", "/cognify",
                    json={"datasets": [entity_id], "run_in_background": False},
                    timeout=120.0,
                )
                cognee_enriched.append(entity_id)
            except Exception as e:
                cognee_failed.append(entity_id)
                print(f"[mnemos] Cognee cognify failed for {entity_id}: {e}")

    return {
        "nodes_before": nodes_before,
        "nodes_after": nodes_after,
        "pruned_count": len(ids_to_prune),
        "pruned_entities": [
            {"entity_id": eid, "pruned_events": count}
            for eid, count in per_entity.items()
        ],
        "cognee_enriched_entities": cognee_enriched,
        "cognee_failed_entities": cognee_failed,
    }


# ─── Route: POST /forget ─────────────────────────────────────────────────────

class ForgetRequest(BaseModel):
    entity_id: str

@app.post("/forget")
async def forget_entity(req: ForgetRequest, _=Depends(require_write_access)):
    """Soft-delete an entity from active views. History is preserved.
    Also clears the entity's derived memory in Cognee Cloud (graph + embeddings)
    while keeping raw uploaded text, so it's reversible on both sides."""
    storage.forget_entity(req.entity_id)

    cognee_status = "skipped"
    if COGNEE_AVAILABLE:
        try:
            await _cognee_request(
                "POST", "/forget",
                json={"dataset": req.entity_id, "memory_only": True},
                timeout=30.0,
            )
            cognee_status = "cleared"
        except httpx.HTTPStatusError as e:
            cognee_status = "not_synced" if e.response.status_code == 404 else f"failed: {e.response.status_code}"
            print(f"[mnemos] Cognee forget failed for {req.entity_id}: {e}")
        except Exception as e:
            cognee_status = f"failed: {str(e)[:80]}"
            print(f"[mnemos] Cognee forget failed for {req.entity_id}: {e}")

    return {"entity_id": req.entity_id, "forgotten": True, "cognee_status": cognee_status}


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.post("/admin/clear-data")
async def admin_clear_data():
    """TEMP: Clear all data from database."""
    from db import get_connection
    conn = get_connection()
    tables = ["events","alerts","state_changes","agent_state","cognee_retry","conflicts","forgotten_entities"]
    for t in tables:
        conn.execute(f"DELETE FROM {t}")
    conn.commit()
    conn.close()
    return {"status": "cleared", "tables": tables}

@app.get("/debug/check-attributes")
async def debug_check_attributes():
    """Check attribute extraction in stored events."""
    from db import get_connection
    import json
    conn = get_connection()
    rows = conn.execute("SELECT id, entity_id, payload FROM events WHERE entity_id = ? ORDER BY id", ("acme_corp",)).fetchall()
    results = []
    for r in rows:
        p = json.loads(r["payload"])
        results.append({
            "id": r["id"], "entity_id": r["entity_id"],
            "attribute_type": p.get("attribute_type"),
            "attribute_value": p.get("attribute_value"),
            "attribute_source": p.get("attribute_source"),
            "text": p.get("raw_text", "")[:80],
        })
    conn.close()
    return {"events": results}

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "mnemos",
        "version": "0.2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cognee_available": COGNEE_AVAILABLE,
        "agent": agent_loop.get_agent_status(),
        "ai": get_ai_status(),
    }


# ─── DEBUG: Temporary Cognee connectivity test (remove after preflight) ───────

@app.get("/debug/cognee-ping")
async def debug_cognee_ping():
    """
    Temporary endpoint to test Cognee Cloud reachability from Railway's
    Linux container. Tests TLS handshake, DNS resolution, and API auth.
    Remove after preflight verification is complete.
    """
    import ssl
    import platform

    results = {
        "platform": platform.platform(),
        "python_ssl": ssl.OPENSSL_VERSION,
        "cognee_api_base": COGNEE_API_BASE,
        "cognee_key_present": bool(COGNEE_API_KEY),
        "cognee_key_prefix": COGNEE_API_KEY[:8] + "..." if COGNEE_API_KEY else "N/A",
    }

    # Test 1: Raw TLS handshake
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{COGNEE_API_BASE}/api/v1/health")
            results["tls_handshake"] = "OK"
            results["health_status"] = resp.status_code
            results["health_body"] = resp.text[:500]
    except Exception as e:
        results["tls_handshake"] = "FAILED"
        results["tls_error"] = f"{type(e).__name__}: {str(e)[:300]}"

    # Test 2: Authenticated /add endpoint (POST with dummy data)
    if results.get("tls_handshake") == "OK" and COGNEE_AVAILABLE:
        try:
            resp2 = await _cognee_request("POST", "/add", json={
                "data": "preflight connectivity test",
                "dataset_name": "preflight_test",
            })
            results["add_endpoint"] = "OK"
            results["add_response"] = str(resp2)[:300]
        except Exception as e:
            results["add_endpoint"] = "FAILED"
            results["add_error"] = f"{type(e).__name__}: {str(e)[:300]}"

    # Test 3: Search endpoint
    if results.get("tls_handshake") == "OK" and COGNEE_AVAILABLE:
        try:
            resp3 = await _cognee_request("POST", "/search", json={
                "query": "preflight test",
                "query_type": "INSIGHTS",
            })
            results["search_endpoint"] = "OK"
            results["search_response"] = str(resp3)[:300]
        except Exception as e:
            results["search_endpoint"] = "FAILED"
            results["search_error"] = f"{type(e).__name__}: {str(e)[:300]}"

    return results


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
