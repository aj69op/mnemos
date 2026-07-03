"""
main.py — Mnemos FastAPI Backend
==================================
7 routes + CORS + cognee integration + startup agent loop.

Changes from original:
  #3 FIX: Gemini fallback now uses a sliding window of last 20 events
           instead of dumping all history into the prompt.
  #4 FIX: Failed Cognee uploads are queued in cognee_retry table and
           retried on the next agent scan, so local storage and Cognee
           never drift silently.
  #5 FIX: /ingest and /import-csv validate dates with validate_date_str()
           and return 422 on bad input rather than silently defaulting.

Routes:
  POST /ingest                    → classify + cognee.add + store + update state
  POST /query                     → cognee.search over entity dataset
  GET  /customer/{id}/timeline    → all events for entity, chronological
  GET  /customer/{id}/commitments → open promises + entropy scores
  GET  /alerts                    → proactive alerts from agent loop
  GET  /entities                  → list all known entities + states
  POST /import-csv                → bulk CSV import
"""

import io
import csv
import os
import asyncio
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
from entropy_engine import validate_date_str   # #5: loud date validation

import storage
import entropy_engine
import agent_loop
from ai_client import call_ai_with_fallback, get_ai_status

# ─── Cognee Cloud Pro API ─────────────────────────────────────────────────────
COGNEE_API_BASE  = os.environ.get("COGNEE_API_BASE", "https://api.cognee.ai")
COGNEE_API_KEY   = os.environ.get("COGNEE_API_KEY", "")
COGNEE_TENANT_ID = os.environ.get("COGNEE_TENANT_ID", "")
COGNEE_AVAILABLE = bool(COGNEE_API_KEY)

if not COGNEE_AVAILABLE:
    print("[mnemos] WARNING: COGNEE_API_KEY not set. Cognee Cloud semantic search disabled.")
else:
    print(f"[mnemos] Cognee Cloud Pro configured at {COGNEE_API_BASE}")

# #3 FIX: max events passed to Gemini fallback prompt
GEMINI_FALLBACK_WINDOW = int(os.environ.get("GEMINI_FALLBACK_WINDOW", "20"))


async def _cognee_request(method: str, path: str, **kwargs) -> dict | list | None:
    """Make an authenticated request to the Cognee Cloud Pro API."""
    url = f"{COGNEE_API_BASE}/api/v1{path}"
    headers = {
        "X-Api-Key": COGNEE_API_KEY,
        "X-Tenant-Id": COGNEE_TENANT_ID,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
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
    storage.save_event(event)

    # 3. Ingest into Cognee Cloud
    cognee_status = "skipped"
    if COGNEE_AVAILABLE:
        try:
            await _cognee_request("POST", "/add", json={
                "data": req.text,
                "dataset_name": req.entity_id,
            })
            await _cognee_request("POST", "/cognify")
            cognee_status = "indexed"
        except Exception as e:
            # #4 FIX: queue for retry instead of silently losing the upload
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

@app.post("/query", response_model=QueryResponse)
async def query_entity(req: QueryRequest):
    """
    Natural language query over an entity's interaction history.

    Cognee Cloud: uses INSIGHTS graph search (full history).
    Fallback: sliding window of last GEMINI_FALLBACK_WINDOW events (#3 fix).
    """
    events = storage.get_events(req.entity_id)
    if not events:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for entity '{req.entity_id}'"
        )

    # ── Try Cognee Cloud semantic search (scoped to entity dataset) ──
    if COGNEE_AVAILABLE:
        # Try multiple query types: CHUNKS searches raw text, GRAPH_COMPLETION
        # uses the knowledge graph to generate an answer
        for qtype in ["CHUNKS", "GRAPH_COMPLETION", "INSIGHTS"]:
            try:
                results = await _cognee_request("POST", "/search", json={
                    "query": req.query,
                    "query_type": qtype,
                    "dataset_name": req.entity_id,
                })
                if not results:
                    continue

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

                # Filter out unhelpful responses: clarifying questions,
                # "provide triples" requests, or too-short answers
                unhelpful_markers = [
                    "node1", "triples you", "do you need details",
                    "could you please provide", "which contract or service",
                    "please share", "can you provide", "what specific",
                    "i can't determine", "i cannot determine",
                    "without the knowledge-graph", "please provide the list",
                ]
                lower_answer = clean_answer.lower()
                is_unhelpful = (
                    len(clean_answer) < 30
                    or any(marker in lower_answer for marker in unhelpful_markers)
                )

                if not is_unhelpful:
                    print(f"[mnemos] Cognee {qtype} returned good result ({len(clean_answer)} chars)")
                    return QueryResponse(
                        entity_id=req.entity_id,
                        query=req.query,
                        answer=clean_answer,
                        events_searched=len(events),
                        search_mode=f"cognee_{qtype.lower()}",
                    )
                print(f"[mnemos] Cognee {qtype} returned unhelpful result, trying next type...")
            except Exception as e:
                print(f"[mnemos] Cognee {qtype} search failed: {e}")

        print(f"[mnemos] All Cognee query types exhausted for {req.entity_id}, falling back to Gemini")

    # ── Gemini/Groq fallback with sliding window ──
    answer = await asyncio.to_thread(
        _gemini_fallback_query, req.query, events, req.entity_id
    )
    window_used = min(len(events), GEMINI_FALLBACK_WINDOW)
    return QueryResponse(
        entity_id=req.entity_id,
        query=req.query,
        answer=answer,
        events_searched=window_used,
        search_mode=f"gemini_fallback_window_{window_used}",
    )


def _gemini_fallback_query(query: str, events: list, entity_id: str) -> str:
    """
    Build a Gemini prompt from recent events only.

    #3 FIX: Only passes the last GEMINI_FALLBACK_WINDOW events to stay
    within token limits. For a customer with 500 interactions, this was
    previously dumping the entire history and hitting a 400 from Gemini.
    """
    # Sliding window — most recent events only
    window = events[-GEMINI_FALLBACK_WINDOW:]
    total = len(events)
    shown = len(window)

    context_lines = []
    for e in window:
        context_lines.append(
            f"[{e.extracted_at}] {e.event_type.upper()} | "
            f"Sentiment: {e.sentiment} ({e.sentiment_intensity:.1f}) | "
            f"{e.raw_text[:300]}"
        )
        for p in e.promises:
            status = "✓ resolved" if p.resolved else "⚠ open"
            context_lines.append(
                f"  Promise ({status}): {p.description} "
                f"[type={p.promise_type}, due={p.due_date or 'none'}]"
            )

    context = "\n".join(context_lines)

    prompt = f"""You are Mnemos, a proactive relationship intelligence assistant for ERP systems.

Entity: {entity_id}
Showing last {shown} of {total} total interactions.

--- INTERACTION HISTORY ---
{context}
--- END HISTORY ---

Question: {query}

Answer based on the interaction history above. Be specific about dates and commitments.
If the answer isn't in the provided window, say so — don't guess."""

    try:
        return call_ai_with_fallback(prompt)
    except Exception as e:
        return f"Query failed: {str(e)}"


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
    alerts = agent_loop.get_latest_alerts()

    # Fresh scan if no persisted alerts (first boot after migration)
    if not alerts:
        alerts = entropy_engine.get_all_alerts(min_severity="medium")

    alert_dicts = [asdict(a) for a in alerts]
    summary = entropy_engine.get_alert_summary()
    at_risk = agent_loop.get_at_risk_entities()
    status = agent_loop.get_agent_status()

    return {
        "alerts": alert_dicts,
        "summary": summary,
        "at_risk_entities": at_risk,
        "agent_status": status,
    }


# ─── Route 6: GET /entities ───────────────────────────────────────────────────

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
    cognee_batch_ids = set()

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
            event = await asyncio.to_thread(
                classify_erp_event,
                text=text_val,
                entity_id=entity_id,
                entity_type=entity_type,
            )

            if date_str:
                event.extracted_at = date_str

            storage.save_event(event)

            if COGNEE_AVAILABLE:
                try:
                    await _cognee_request("POST", "/add", json={
                        "data": text_val,
                        "dataset_name": entity_id,
                    })
                    cognee_batch_ids.add(entity_id)
                except Exception as e:
                    # #4 FIX: queue retry instead of silent drop
                    storage.queue_cognee_retry(entity_id, text_val)
                    print(f"[mnemos] Cognee add failed row {row_num}, queued retry: {e}")

            results.append({
                "row": row_num,
                "status": "ingested",
                "entity_id": entity_id,
                "event_type": event.event_type,
                "promises_found": len(event.promises),
            })

        except Exception as e:
            results.append({"row": row_num, "status": "error", "error": str(e)})

    # Trigger cognify for all successfully added datasets
    if COGNEE_AVAILABLE and cognee_batch_ids:
        for ds_name in cognee_batch_ids:
            try:
                await _cognee_request("POST", "/cognify", json={"dataset_name": ds_name})
            except Exception as e:
                print(f"[mnemos] Cognee cognify failed for {ds_name}: {e}")

    agent_loop.run_agent_scan()

    return {
        "total_rows": row_num,
        "imported": sum(1 for r in results if r.get("status") == "ingested"),
        "skipped":  sum(1 for r in results if r.get("status") == "skipped"),
        "errors":   sum(1 for r in results if r.get("status") == "error"),
        "results":  results,
    }


# ─── Health Check ─────────────────────────────────────────────────────────────

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
