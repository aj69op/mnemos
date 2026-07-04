"""
erp_schema.py — Mnemos ERP Ontology Layer
==========================================
This is the "domain brain" of Mnemos. It defines:
  1. The 6 entity types Mnemos understands
  2. The relationship types between them
  3. The Gemini extraction function that converts raw text → structured ERP events
  4. The cognee metadata tags used to make graph nodes ERP-aware

Every other file imports from here. Change the ontology here, everything updates.
"""

import os
import json
import re
import time
from datetime import datetime, timezone
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional
from ai_client import call_ai_with_fallback
# ─── 1. ENTITY TYPES ──────────────────────────────────────────────────────────
# These are the 6 things Mnemos understands. Every interaction maps to one or more.

class EntityType(str, Enum):
    CUSTOMER        = "Customer"         # A person or company on the sales/CRM side
    VENDOR          = "Vendor"           # A supplier or partner on the ops side
    INTERACTION     = "Interaction"      # A call, email, meeting, note
    PROMISE         = "Promise"          # A commitment made by either party
    SENTIMENT_SIGNAL = "SentimentSignal" # Detected emotional signal in an interaction
    RELATIONSHIP_STATE = "RelationshipState" # Current lifecycle state of the relationship


# ─── 2. RELATIONSHIP TYPES ────────────────────────────────────────────────────
# These become edges in the cognee knowledge graph.

class RelationshipType(str, Enum):
    MADE_PROMISE        = "MADE_PROMISE"        # Customer/Vendor → Promise
    HAD_INTERACTION     = "HAD_INTERACTION"     # Customer/Vendor → Interaction
    SHOWS_SENTIMENT     = "SHOWS_SENTIMENT"     # Interaction → SentimentSignal
    IN_STATE            = "IN_STATE"            # Customer/Vendor → RelationshipState
    FOLLOWED_UP         = "FOLLOWED_UP"         # Promise → Interaction (resolution)
    ESCALATED_FROM      = "ESCALATED_FROM"      # Interaction → Interaction (escalation)
    PREFERRED_CHANNEL   = "PREFERRED_CHANNEL"   # Customer → channel string


# ─── 3. RELATIONSHIP LIFECYCLE STATES ─────────────────────────────────────────
# Every customer/vendor moves through these states. Mnemos transitions them automatically.

class RelationshipState(str, Enum):
    PROSPECT    = "PROSPECT"    # Early stage, not yet engaged
    ENGAGED     = "ENGAGED"     # Active communication, positive trajectory
    TRUSTED     = "TRUSTED"     # Stable, reliable relationship
    AT_RISK     = "AT_RISK"     # Warning signs detected (broken promises, negative sentiment)
    CHURNED     = "CHURNED"     # Relationship effectively dead


# ─── 4. PROMISE URGENCY WEIGHTS ───────────────────────────────────────────────
# Used by the entropy engine. Higher weight = faster decay toward alert threshold.

URGENCY_WEIGHTS = {
    "payment":      1.5,   # Payment promises decay fast
    "delivery":     1.3,   # Delivery commitments matter a lot
    "callback":     1.2,   # Promised callbacks are time-sensitive
    "proposal":     1.0,   # Standard urgency
    "discount":     0.8,   # Less urgent, still tracked
    "meeting":      0.9,
    "document":     0.7,
    "other":        0.6,
}


# ─── 5. DATACLASSES ───────────────────────────────────────────────────────────
# Structured output of the extraction pipeline. These get stored as cognee metadata.

@dataclass
class ExtractedPromise:
    description: str                    # What was promised
    promise_type: str                   # One of URGENCY_WEIGHTS keys
    made_by: str                        # "customer", "vendor", or "us"
    due_date: Optional[str] = None      # ISO date string if mentioned
    urgency_weight: float = 1.0
    resolved: bool = False

@dataclass
class ExtractedERPEvent:
    """
    The fully structured output of classify_erp_event().
    This is what gets stored in cognee as metadata alongside the raw text.
    """
    raw_text: str
    customer_or_vendor_id: str
    entity_type: str                            # "Customer" or "Vendor"
    event_type: str                             # promise / complaint / update / escalation / neutral
    entities_mentioned: list[str] = field(default_factory=list)
    promises: list[ExtractedPromise] = field(default_factory=list)
    sentiment: str = "neutral"                  # positive / negative / neutral / mixed
    sentiment_intensity: float = 0.0            # 0.0 → 1.0
    erp_tags: list[str] = field(default_factory=list)  # free-form tags for graph filtering
    relationship_signals: list[str] = field(default_factory=list)  # "trust_building", "churn_risk" etc.
    attribute_type: Optional[str] = None
    attribute_value: Optional[str] = None
    attribute_source: Optional[str] = None
    extracted_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─── 6. GEMINI EXTRACTION FUNCTION ────────────────────────────────────────────
# This is the core intelligence. Takes raw interaction text, returns ExtractedERPEvent.

EXTRACTION_PROMPT = """
You are an ERP relationship analyst. Extract structured information from this business interaction note.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{{
  "event_type": "<one of: promise | complaint | update | escalation | neutral>",
  "entities_mentioned": ["<person or company names>"],
  "sentiment": "<one of: positive | negative | neutral | mixed>",
  "sentiment_intensity": <0.0 to 1.0>,
  "erp_tags": ["<relevant tags like: payment, delivery, renewal, onboarding, support, pricing>"],
  "relationship_signals": ["<signals like: trust_building, churn_risk, upsell_opportunity, escalation_risk, re_engagement>"],
  "attribute_type": "<If the text mentions a delivery date, payment amount, or payment status, tag it here (e.g. delivery_date, payment_amount, payment_status). Else null>",
  "attribute_value": "<The value of the attribute, or null>",
  "attribute_source": "<The source of the information, e.g. WhatsApp, Invoice, CRM, or null>",
  "promises": [
    {{
      "description": "<what was promised>",
      "promise_type": "<payment | delivery | callback | proposal | discount | meeting | document | other>",
      "made_by": "<customer | vendor | us>",
      "due_date": "<ISO date string or null>",
      "resolved": false
    }}
  ]
}}

If there are no promises, return an empty array for "promises".
Today's date is {today}.

Interaction note:
{text}
"""

def classify_erp_event(
    text: str,
    entity_id: str,
    entity_type: str = "Customer"
) -> ExtractedERPEvent:
    """
    Takes raw interaction text and returns a fully structured ExtractedERPEvent.

    Args:
        text:        Raw interaction note (call log, email snippet, CRM note)
        entity_id:   Customer or vendor ID from your ERP
        entity_type: "Customer" or "Vendor"

    Returns:
        ExtractedERPEvent with all fields populated
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    prompt = EXTRACTION_PROMPT.format(text=text, today=today)

    # Fast fallback for rate limits to prevent CSV import timeouts
    max_retries = 3
    for attempt in range(max_retries + 1):
        try:
            raw = call_ai_with_fallback(prompt)

            # Strip markdown fences if Gemini wraps in ```json
            raw = re.sub(r"^```json\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            data = json.loads(raw)

            # Build promise objects with urgency weights
            promises = []
            for p in data.get("promises", []):
                ptype = p.get("promise_type", "other")
                promises.append(ExtractedPromise(
                    description=p.get("description", ""),
                    promise_type=ptype,
                    made_by=p.get("made_by", "customer"),
                    due_date=p.get("due_date"),
                    urgency_weight=URGENCY_WEIGHTS.get(ptype, 0.6),
                    resolved=p.get("resolved", False),
                ))

            return ExtractedERPEvent(
                raw_text=text,
                customer_or_vendor_id=entity_id,
                entity_type=entity_type,
                event_type=data.get("event_type", "neutral"),
                entities_mentioned=data.get("entities_mentioned", []),
                promises=promises,
                sentiment=data.get("sentiment", "neutral"),
                sentiment_intensity=float(data.get("sentiment_intensity", 0.0)),
                erp_tags=data.get("erp_tags", []),
                relationship_signals=data.get("relationship_signals", []),
                attribute_type=data.get("attribute_type"),
                attribute_value=data.get("attribute_value"),
                attribute_source=data.get("attribute_source"),
            )

        except Exception as api_err:
            err_str = str(api_err)
            if "429" in err_str and attempt < max_retries:
                wait = (2 ** attempt) * 15  # 15s, 30s, 60s, 120s
                print(f"[erp_schema] Rate limited for {entity_id}, retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait)
                continue
            elif "429" not in err_str and isinstance(api_err, (json.JSONDecodeError, KeyError, AttributeError)):
                break  # Fall through to regex fallback
            else:
                print(f"[erp_schema] Gemini API error for {entity_id}: {api_err}")
                break  # Fall through to regex fallback

    # Fallback — regex-based extraction when Gemini fails
    print(f"[erp_schema] Using regex fallback for {entity_id}")
    promises = []
    # Find explicit promises like "promised to ... by 2026-XX-XX"
    match = re.search(r"promise.*? to (.*?) by (\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)
    if match:
        desc = match.group(1).strip()
        due = match.group(2)
        ptype = "payment" if "pay" in desc.lower() else "delivery" if "deliver" in desc.lower() else "meeting" if "meeting" in desc.lower() else "other"
        promises.append(ExtractedPromise(
            description=desc,
            promise_type=ptype,
            made_by="customer" if entity_type.lower() == "customer" else "vendor",
            due_date=due,
            urgency_weight=1.5,
            resolved=False
        ))

    return ExtractedERPEvent(
        raw_text=text,
        customer_or_vendor_id=entity_id,
        entity_type=entity_type,
        event_type="promise" if promises else "neutral",
        promises=promises,
        sentiment="negative" if "frustration" in text.lower() or "disaster" in text.lower() or "furious" in text.lower() else "positive" if "happy" in text.lower() or "win" in text.lower() or "flawless" in text.lower() else "neutral",
    )


# ─── 7. STATE TRANSITION LOGIC ────────────────────────────────────────────────
# Given a history of extracted events, determine the current relationship state.

def compute_relationship_state(events: list[ExtractedERPEvent]) -> RelationshipState:
    """
    Looks at recent events and returns the current relationship lifecycle state.
    Called after every new ingest to update the entity's state node in cognee.
    """
    if not events:
        return RelationshipState.PROSPECT

    recent = events[-5:]  # Look at last 5 events only

    # Count signals
    churn_signals   = sum(1 for e in recent if "churn_risk" in e.relationship_signals)
    trust_signals   = sum(1 for e in recent if "trust_building" in e.relationship_signals)
    escalations     = sum(1 for e in recent if e.event_type == "escalation")
    negative_count  = sum(1 for e in recent if e.sentiment == "negative")
    open_promises   = sum(
        1 for e in recent
        for p in e.promises
        if not p.resolved
    )

    # State machine — order matters, most severe checked first
    if any("churn_confirmed" in e.relationship_signals for e in recent):
        return RelationshipState.CHURNED
    if escalations >= 2 or churn_signals >= 2:
        return RelationshipState.AT_RISK
    if negative_count >= 3 or open_promises >= 3:
        return RelationshipState.AT_RISK
    if trust_signals >= 2:
        return RelationshipState.TRUSTED
    if len(events) >= 2:
        return RelationshipState.ENGAGED
    return RelationshipState.PROSPECT


# ─── 8. COGNEE METADATA FORMATTER ─────────────────────────────────────────────
# Converts an ExtractedERPEvent into the flat dict that cognee stores as node metadata.

def to_cognee_metadata(event: ExtractedERPEvent) -> dict:
    """
    Returns a flat dict suitable for passing to cognee.remember() as metadata.
    cognee uses this to tag graph nodes — enables filtered recall later.
    """
    return {
        "entity_id":            event.customer_or_vendor_id,
        "entity_type":          event.entity_type,
        "event_type":           event.event_type,
        "sentiment":            event.sentiment,
        "sentiment_intensity":  event.sentiment_intensity,
        "erp_tags":             ",".join(event.erp_tags),
        "relationship_signals": ",".join(event.relationship_signals),
        "has_promises":         len(event.promises) > 0,
        "open_promise_count":   sum(1 for p in event.promises if not p.resolved),
        "extracted_at":         event.extracted_at,
    }


# ─── QUICK TEST ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_text = (
        "Called Rahul at Acme Corp. He's frustrated about the delayed shipment from last week. "
        "Said he'll hold the renewal until we fix it. I promised him a revised delivery timeline "
        "by Friday and offered a 10% discount on next order to smooth things over."
    )

    event = classify_erp_event(test_text, entity_id="acme_001", entity_type="Customer")

    print("=== Extracted ERP Event ===")
    print(f"Event type:    {event.event_type}")
    print(f"Sentiment:     {event.sentiment} ({event.sentiment_intensity})")
    print(f"ERP tags:      {event.erp_tags}")
    print(f"Signals:       {event.relationship_signals}")
    print(f"Promises ({len(event.promises)}):")
    for p in event.promises:
        print(f"  - [{p.promise_type}] {p.description} (due: {p.due_date}, weight: {p.urgency_weight})")

    state = compute_relationship_state([event])
    print(f"\nRelationship state: {state.value}")

    meta = to_cognee_metadata(event)
    print(f"\nCognee metadata: {json.dumps(meta, indent=2)}")
