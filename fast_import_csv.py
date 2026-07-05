"""
fast_import_csv.py — AI-free CSV import for Mnemos demo data
=============================================================
Reads a CSV and builds ExtractedERPEvent objects using keyword
rules instead of LLM calls. Instant, zero API quota consumed.
"""

import csv
import io
import re
import sys
import os
from datetime import datetime, timezone
from erp_schema import (
    ExtractedERPEvent, ExtractedPromise,
    URGENCY_WEIGHTS, RelationshipState,
    compute_relationship_state,
)
import storage
from conflict_detector import check_for_conflict

PROMISE_PAT = re.compile(
    r'(?:promised?\s+(?:to|that\s+they\s+would|they\s+will)\s+)?'
    r'(?:promised?\s+(?:to|that\s+they\s+would|they\s+will)\s+)?(.+?)(?:by\s+(\d{4}-\d{2}-\d{2})|$)',
    re.IGNORECASE
)

def _has_phrase(text: str, *phrases: str) -> bool:
    t = text.lower()
    return any(p.lower() in t for p in phrases)

def classify_without_ai(text: str, entity_id: str, entity_type: str, date_str: str = "") -> ExtractedERPEvent:
    t = text.lower()

    # ── Sentiment ──────────────────────────────────────────────
    positive_words = ["happy", "thrilled", "excellent", "smooth", "positive",
                      "well", "exceeded", "very satisfied", "impressive",
                      "enthusiastic", "smoothly", "flawless", "great",
                      "proactive", "good"]
    negative_words = ["frustrat", "unhappy", "disaster", "furious", "angry",
                      "concern", "delay", "delayed", "complaint", "pain",
                      "unresolved", "not responding", "missed", "lost",
                      "terminat", "worrying", "concerning"]
    mixed_words = ["but", "however", "although", "concerns about"]

    pos_score = sum(1 for w in positive_words if w in t)
    neg_score = sum(1 for w in negative_words if w in t)
    has_mixed = any(w in t for w in mixed_words)

    if pos_score > 0 and neg_score > 0:
        sentiment = "mixed"
        intensity = min(1.0, (pos_score + neg_score) * 0.2 + 0.3)
    elif neg_score > 0:
        sentiment = "negative"
        intensity = min(1.0, neg_score * 0.25)
    elif pos_score > 0:
        sentiment = "positive"
        intensity = min(1.0, pos_score * 0.2)
    else:
        sentiment = "neutral"
        intensity = 0.0

    # ── Event type ─────────────────────────────────────────────
    if _has_phrase(t, "terminat", "cancelled", "churned", "ended", "lost a major client", "lost a major"):
        event_type = "escalation"
    elif _has_phrase(t, "frustrat", "angry", "concern", "complaint", "delay", "warning"):
        event_type = "complaint"
    elif _has_phrase(t, "promised", "promise", "committed", "commitment"):
        event_type = "promise"
    elif _has_phrase(t, "signed", "went live", "cutover", "deployed", "received"):
        event_type = "update"
    else:
        event_type = "neutral"

    # ── ERP tags ───────────────────────────────────────────────
    erp_tags = []
    if _has_phrase(t, "payment", "invoice", "po", "purchase order", "rupees", "inr", "pricing"):
        erp_tags.append("payment")
    if _has_phrase(t, "delivery", "shipment", "dispatch", "logistics"):
        erp_tags.append("delivery")
    if _has_phrase(t, "renewal", "contract"):
        erp_tags.append("renewal")
    if _has_phrase(t, "onboard", "demo", "trial", "kickoff"):
        erp_tags.append("onboarding")
    if _has_phrase(t, "support", "issue", "bug", "problem", "migration"):
        erp_tags.append("support")
    if _has_phrase(t, "analytics", "dashboard", "report", "module", "add-on"):
        erp_tags.append("product")

    # ── Relationship signals ───────────────────────────────────
    signals = []
    if _has_phrase(t, "churn", "terminat", "cancelled", "competitor", "lost a major client", "relationship ended"):
        signals.append("churn_confirmed" if _has_phrase(t, "terminat", "cancelled", "relationship ended", "lost a major") else "churn_risk")
    if _has_phrase(t, "trust", "reliable", "ahead of schedule", "zero defects", "consistent", "trustworthy"):
        signals.append("trust_building")
    if _has_phrase(t, "upsell", "add-on", "analytics module", "additional"):
        signals.append("upsell_opportunity")
    if _has_phrase(t, "escalat", "warning", "not responding", "formal"):
        signals.append("escalation_risk")

    # ── Attribute extraction ───────────────────────────────────
    attr_type = None
    attr_value = None
    attr_source = None
    if _has_phrase(t, "payment of", "payment"):
        m = re.search(r'(?:payment|worth|of)\s+(?:INR|₹|Rs\.?)\s?([\d,]+)', text, re.IGNORECASE)
        if m:
            attr_type = "payment_amount"
            attr_value = f"INR {m.group(1)}"
            attr_source = "interaction note"
        m2 = re.search(r'paid\s+(?:on|by)\s+(\d{4}-\d{2}-\d{2})', t)
        if m2:
            attr_type = "payment_date"
            attr_value = m2.group(1)
            attr_source = "interaction note"
    if _has_phrase(t, "delivery", "dispatch", "shipment"):
        attr_type = "delivery_date"
        m = re.search(r'(?:by|before|within|on)\s+(\d{4}-\d{2}-\d{2})', text)
        if m:
            attr_value = m.group(1)
            attr_source = "interaction note"
    if _has_phrase(t, "whatsapp", "email", "call", "meeting", "linkedin"):
        if "whatsapp" in t:
            attr_source = "WhatsApp"
        elif "email" in t:
            attr_source = "Email"
        elif "call" in t:
            attr_source = "Phone Call"
        elif "meeting" in t:
            attr_source = "Meeting"
        elif "linkedin" in t:
            attr_source = "LinkedIn"

    # ── Promises ───────────────────────────────────────────────
    promises = []
    promise_sentences = re.findall(
        r'(?:promised?\s+(?:to|that\s+they\s+would|that\s+they\s+will)\s+|[Tt]hey\s+promised?\s+)'
        r'([^.]*?(?:by\s+\d{4}-\d{2}-\d{2})?[^.]*)\.',
        text
    )
    if not promise_sentences:
        m = re.search(r'[Pp]romise[^.]*?to\s+([^.]*?(?:by\s+\d{4}-\d{2}-\d{2})?[^.]*)\.', text)
        if m:
            promise_sentences = [m.group(1)]

    for ps in promise_sentences:
        due_m = re.search(r'by\s+(\d{4}-\d{2}-\d{2})', ps)
        due = due_m.group(1) if due_m else None
        desc = re.sub(r'by\s+\d{4}-\d{2}-\d{2}', '', ps).strip().rstrip(',').strip()

        if len(desc) < 8:
            # Try broader catch
            m2 = re.search(r'promise[^.]*?to\s+(.+?)(?:by\s+\d{4}-\d{2}-\d{2}|$)', text, re.IGNORECASE)
            if m2 and len(m2.group(1).strip()) > len(desc):
                desc = m2.group(1).strip().rstrip(',').strip()

        desc_lower = desc.lower()
        if _has_phrase(desc_lower, "payment", "pay", "invoice"):
            ptype = "payment"
        elif _has_phrase(desc_lower, "deliver", "dispatch", "ship", "order"):
            ptype = "delivery"
        elif _has_phrase(desc_lower, "call", "callback", "follow up"):
            ptype = "callback"
        elif _has_phrase(desc_lower, "proposal", "quote", "estimate", "contract", "nda", "po"):
            ptype = "proposal"
        elif _has_phrase(desc_lower, "discount", "offer"):
            ptype = "discount"
        elif _has_phrase(desc_lower, "meeting", "demo", "workshop", "review"):
            ptype = "meeting"
        elif _has_phrase(desc_lower, "document", "specs", "report", "catalog", "roadmap"):
            ptype = "document"
        else:
            ptype = "other"

        made_by = "customer" if entity_type.lower() == "customer" else "vendor"
        if _has_phrase(desc_lower, "we promised", "we offered", "we will", "we have scheduled", "we need", "our team"):
            made_by = "us"
        elif _has_phrase(desc_lower, "they promised", "they will", "they have"):
            made_by = "vendor" if entity_type.lower() == "customer" else "customer"

        resolved = _has_phrase(desc_lower, "received", "signed", "confirmed", "done", "completed", "delivered")

        promises.append(ExtractedPromise(
            description=desc.strip().capitalize() if desc else "Unspecified commitment",
            promise_type=ptype,
            made_by=made_by,
            due_date=due,
            urgency_weight=URGENCY_WEIGHTS.get(ptype, 0.6),
            resolved=resolved,
        ))

    # ── Fallback: if no promise detected by regex, try broader ─
    if not promises and _has_phrase(t, "promise", "promised"):
        bc = re.search(r'(?:promised?|promise)\s+(?:to\s+)?(.{10,60}?)(?:by\s+(\d{4}-\d{2}-\d{2}))?', text, re.IGNORECASE)
        if bc:
            desc = bc.group(1).strip().rstrip(',').strip().rstrip('.')
            due_bc = bc.group(2) if bc.lastindex and bc.group(2) else None
            promises.append(ExtractedPromise(
                description=desc,
                promise_type="other",
                made_by="customer" if entity_type.lower() == "customer" else "vendor",
                due_date=due_bc,
                urgency_weight=0.6,
                resolved=False,
            ))

    extracted_at = date_str if date_str else datetime.now(timezone.utc).isoformat()

    return ExtractedERPEvent(
        raw_text=text,
        customer_or_vendor_id=entity_id,
        entity_type=entity_type,
        event_type=event_type,
        promises=promises,
        sentiment=sentiment,
        sentiment_intensity=intensity,
        erp_tags=erp_tags,
        relationship_signals=signals,
        attribute_type=attr_type,
        attribute_value=attr_value,
        attribute_source=attr_source,
        extracted_at=extracted_at,
    )


def fast_import_csv(filepath: str) -> dict:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    reader = csv.DictReader(io.StringIO(content))
    results = []
    row_num = 0

    for row in reader:
        row_num += 1
        entity_id   = row.get("entity_id", "").strip()
        entity_type = row.get("entity_type", "Customer").strip()
        text_val    = row.get("text", "").strip()
        date_str    = row.get("date", "").strip()

        if not entity_id or not text_val:
            results.append({"row": row_num, "status": "skipped", "reason": "Missing entity_id or text"})
            continue

        try:
            event = classify_without_ai(text_val, entity_id, entity_type, date_str)
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
                "row": row_num, "status": "ingested",
                "entity_id": entity_id, "event_type": event.event_type,
                "sentiment": event.sentiment, "promises_found": len(event.promises),
            })
        except Exception as e:
            results.append({"row": row_num, "status": "error", "error": str(e)})

    # Log summary
    ingested = sum(1 for r in results if r["status"] == "ingested")
    errors   = sum(1 for r in results if r["status"] == "error")
    skipped  = sum(1 for r in results if r["status"] == "skipped")

    print(f"\n=== Fast Import Complete ===")
    print(f"  Total rows:  {row_num}")
    print(f"  Ingested:    {ingested}")
    print(f"  Skipped:     {skipped}")
    print(f"  Errors:      {errors}")
    if errors:
        for r in results:
            if r["status"] == "error":
                print(f"  - Row {r['row']}: {r['error']}")

    return {
        "total_rows": row_num, "imported": ingested,
        "skipped": skipped, "errors": errors, "results": results,
    }


if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "demo_data.csv"
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        sys.exit(1)
    result = fast_import_csv(csv_path)
    # Also try to find the frontend CSV
    alt_path = "frontend/public/demo-import-all-cases.csv"
    if os.path.exists(alt_path) and csv_path != alt_path:
        print(f"\nAlso importing {alt_path}...")
        result2 = fast_import_csv(alt_path)
        result["imported"] += result2["imported"]
        result["total_rows"] += result2["total_rows"]
    sys.exit(0 if result["errors"] == 0 else 1)
