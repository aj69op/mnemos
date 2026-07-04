"""
seed_demo.py — Mnemos Demo Seeder
===================================
Wipes the DB and seeds 6 realistic Indian SME entities with 60+ days of
interaction history so entropy scores are non-trivial on first load.

Entities:
  1. rajesh_textiles        — TRUSTED, one overdue payment promise (high entropy)
  2. priya_pharma           — AT_RISK, 3 consecutive negative interactions
  3. suresh_logistics       — ENGAGED, active deal in progress
  4. meenakshi_exports      — CHURNED, went silent 45 days ago
  5. vikram_tech_solutions  — PROSPECT, proposal sent, no response in 12 days
  6. ananya_foods_pvt       — TRUSTED, healthy relationship, minor open promise

Run locally against prod DB via Railway CLI:
  railway run python seed_demo.py

Or run locally:
  python seed_demo.py

Wipes existing data first — run once on a clean/prod DB.
"""

import sys
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent))

from db import init_db, db_session
import storage
from storage import save_event

# ─── Helpers ──────────────────────────────────────────────────────────────────

def days_ago(n: float) -> str:
    """Return ISO 8601 timestamp for N days ago."""
    dt = datetime.now(timezone.utc) - timedelta(days=n)
    return dt.isoformat()


def make_promise(
    description: str,
    promise_type: str = "other",
    made_by: str = "us",
    due_date: str = None,
    urgency_weight: float = 0.7,
    resolved: bool = False,
) -> dict:
    return {
        "description": description,
        "promise_type": promise_type,
        "made_by": made_by,
        "due_date": due_date,
        "urgency_weight": urgency_weight,
        "resolved": resolved,
    }


def make_event(
    entity_id: str,
    entity_type: str,
    raw_text: str,
    event_type: str,
    sentiment: str,
    sentiment_intensity: float,
    extracted_at: str,
    promises: list[dict] = None,
    erp_tags: list[str] = None,
    relationship_signals: list[str] = None,
    entities_mentioned: list[str] = None,
) -> dict:
    """Build a raw event dict matching ExtractedERPEvent shape."""
    return {
        "raw_text": raw_text,
        "customer_or_vendor_id": entity_id,
        "entity_type": entity_type,
        "event_type": event_type,
        "entities_mentioned": entities_mentioned or [],
        "promises": promises or [],
        "sentiment": sentiment,
        "sentiment_intensity": sentiment_intensity,
        "erp_tags": erp_tags or [],
        "relationship_signals": relationship_signals or [],
        "extracted_at": extracted_at,
    }


# ─── Import erp_schema types ──────────────────────────────────────────────────

from erp_schema import ExtractedERPEvent, ExtractedPromise


def build_event(d: dict) -> ExtractedERPEvent:
    promises = [ExtractedPromise(**p) for p in d.get("promises", [])]
    return ExtractedERPEvent(
        raw_text=d["raw_text"],
        customer_or_vendor_id=d["customer_or_vendor_id"],
        entity_type=d["entity_type"],
        event_type=d["event_type"],
        entities_mentioned=d.get("entities_mentioned", []),
        promises=promises,
        sentiment=d["sentiment"],
        sentiment_intensity=float(d["sentiment_intensity"]),
        erp_tags=d.get("erp_tags", []),
        relationship_signals=d.get("relationship_signals", []),
        extracted_at=d["extracted_at"],
    )


# ─── Seed data ────────────────────────────────────────────────────────────────

SEED_EVENTS = []

# ── 1. Rajesh Textiles — TRUSTED, high-entropy overdue payment ────────────────
# 8 interactions over 70 days. Payment promised 18 days ago, still open.
SEED_EVENTS += [
    make_event("rajesh_textiles", "Customer",
        "Met Rajesh at the Surat textile expo. Strong interest in our ERP module for fabric inventory. "
        "He runs a mid-size operation — about 200 looms. Asked for a product demo next week.",
        "positive", "positive", 0.7, days_ago(72),
        erp_tags=["lead", "demo_request"], relationship_signals=["interest_expressed"]),

    make_event("rajesh_textiles", "Customer",
        "Conducted product demo via Google Meet. Rajesh was engaged throughout. "
        "Showed him the Tally integration — he was impressed. Said he'd discuss with his partner.",
        "positive", "positive", 0.8, days_ago(65),
        erp_tags=["demo_completed"], relationship_signals=["positive_demo"]),

    make_event("rajesh_textiles", "Customer",
        "Rajesh confirmed they want to move forward. Sent formal proposal for ₹2.4L annual contract. "
        "He asked us to include GST reconciliation module. We agreed to add it at no extra cost.",
        "positive", "positive", 0.9, days_ago(55),
        promises=[make_promise("Include GST reconciliation module in the contract at no extra cost",
                               "proposal", "us", days_ago(48), 0.8)],
        erp_tags=["proposal_sent", "negotiation"], relationship_signals=["deal_progressing"]),

    make_event("rajesh_textiles", "Customer",
        "Contract signed. Onboarding scheduled for next Monday. Rajesh paid 50% advance — ₹1.2L. "
        "Outstanding balance of ₹1.2L due within 30 days of go-live.",
        "positive", "positive", 0.95, days_ago(42),
        promises=[make_promise("Collect outstanding balance of ₹1.2L within 30 days of go-live",
                               "payment", "customer", days_ago(12), 0.9),
                  make_promise("Complete system onboarding by next Monday", "delivery", "us",
                               days_ago(35), 0.8, resolved=True)],
        erp_tags=["contract_signed", "payment_received"], relationship_signals=["deal_closed"]),

    make_event("rajesh_textiles", "Customer",
        "Onboarding completed successfully. Rajesh's team trained on inventory and billing modules. "
        "Minor issue with Tally sync — resolved same day. Team is happy.",
        "positive", "positive", 0.85, days_ago(35),
        erp_tags=["onboarding_complete"], relationship_signals=["implementation_success"]),

    make_event("rajesh_textiles", "Customer",
        "30-day check-in call. Usage is strong — 15 daily active users. "
        "Rajesh mentioned cash flow is tight this month due to festival season inventory. "
        "Asked if we can extend payment deadline by 2 weeks. We agreed.",
        "neutral", "neutral", 0.3, days_ago(22),
        promises=[make_promise("Extended payment deadline by 2 weeks — new due date confirmed",
                               "payment", "us", days_ago(8), 0.7)],
        erp_tags=["check_in", "payment_extension"], relationship_signals=["payment_delay_risk"]),

    make_event("rajesh_textiles", "Customer",
        "Sent payment reminder via WhatsApp. Rajesh replied saying he'll transfer by end of week. "
        "No transfer received yet.",
        "neutral", "neutral", 0.2, days_ago(10),
        erp_tags=["payment_reminder"], relationship_signals=["payment_overdue"]),

    make_event("rajesh_textiles", "Customer",
        "Follow-up call — Rajesh apologetic, says funds will be transferred Monday. "
        "Has been a good customer overall, not worried yet but flagging.",
        "neutral", "neutral", 0.1, days_ago(3),
        erp_tags=["follow_up"], relationship_signals=["payment_delay"]),
]

# ── 2. Priya Pharma — AT_RISK, sentiment drift (3 negative in a row) ──────────
SEED_EVENTS += [
    make_event("priya_pharma", "Customer",
        "Initial meeting with Priya Sharma, procurement head at Priya Pharma Distributors. "
        "They use Zoho CRM but complain it doesn't talk to their billing system. Good fit for us.",
        "positive", "positive", 0.7, days_ago(60),
        erp_tags=["lead"], relationship_signals=["pain_point_identified"]),

    make_event("priya_pharma", "Customer",
        "Demo went okay but Priya raised concerns about our pharma compliance module — "
        "said it doesn't handle Schedule H drugs tracking properly. She's right. We need to fix this.",
        "negative", "negative", -0.5, days_ago(50),
        promises=[make_promise("Fix Schedule H drug tracking in compliance module",
                               "delivery", "us", days_ago(30), 0.9)],
        erp_tags=["demo_completed", "compliance_issue"], relationship_signals=["objection_raised"]),

    make_event("priya_pharma", "Customer",
        "Priya called frustrated — said our support team took 3 days to respond to a pre-sales query. "
        "She's comparing us with a competitor now. Not a good sign.",
        "negative", "negative", -0.7, days_ago(35),
        erp_tags=["complaint", "support_delay"], relationship_signals=["competitor_mentioned", "churn_risk"]),

    make_event("priya_pharma", "Customer",
        "Sent updated proposal with compliance module improvements. Priya acknowledged receipt "
        "but tone was cold. Said she'll 'review it internally'. No timeline given.",
        "negative", "negative", -0.4, days_ago(22),
        erp_tags=["proposal_sent"], relationship_signals=["low_engagement"]),

    make_event("priya_pharma", "Customer",
        "Left voicemail, no callback. Sent follow-up email — no response. "
        "Deal is going cold. May have already signed with competitor.",
        "negative", "negative", -0.8, days_ago(12),
        erp_tags=["follow_up", "no_response"], relationship_signals=["going_dark", "churn_risk"]),
]

# ── 3. Suresh Logistics — ENGAGED, active deal ────────────────────────────────
SEED_EVENTS += [
    make_event("suresh_logistics", "Customer",
        "Referral from Rajesh Textiles. Suresh runs a mid-size freight company, "
        "25 trucks, needs route optimization + billing automation. Strong referral.",
        "positive", "positive", 0.8, days_ago(30),
        erp_tags=["referral", "lead"], relationship_signals=["warm_referral"]),

    make_event("suresh_logistics", "Customer",
        "First call with Suresh Mehta, COO. Very technical, asked detailed questions about "
        "API integrations with their existing GPS tracking system. Promising.",
        "positive", "positive", 0.75, days_ago(24),
        erp_tags=["discovery_call"], relationship_signals=["technical_fit"]),

    make_event("suresh_logistics", "Customer",
        "Sent technical proposal with GPS API integration specs. Suresh loved it. "
        "Requested a pilot on 5 trucks before full rollout. We agreed to 2-week pilot.",
        "positive", "positive", 0.85, days_ago(18),
        promises=[make_promise("Set up 2-week pilot on 5 trucks with GPS integration",
                               "delivery", "us", days_ago(4), 0.85),
                  make_promise("Send pilot agreement contract by Friday",
                               "document", "us", days_ago(15), 0.8, resolved=True)],
        erp_tags=["proposal_sent", "pilot_agreed"], relationship_signals=["deal_progressing"]),

    make_event("suresh_logistics", "Customer",
        "Pilot setup underway. Two trucks live on the system. Suresh is excited — "
        "already seeing fuel cost tracking they didn't have before. Good momentum.",
        "positive", "positive", 0.9, days_ago(8),
        erp_tags=["pilot_active"], relationship_signals=["high_engagement", "value_demonstrated"]),
]

# ── 4. Meenakshi Exports — CHURNED, went silent 45 days ago ───────────────────
SEED_EVENTS += [
    make_event("meenakshi_exports", "Customer",
        "Meenakshi Iyer reached out via our website — runs a handicraft export business, "
        "exports to EU and US. Needs GST + customs documentation automation.",
        "positive", "positive", 0.7, days_ago(90),
        erp_tags=["inbound_lead"], relationship_signals=["interest_expressed"]),

    make_event("meenakshi_exports", "Customer",
        "Demo completed. Meenakshi's main pain point is export documentation — "
        "currently doing everything in Excel. Our module would save her 2 days per shipment.",
        "positive", "positive", 0.8, days_ago(80),
        erp_tags=["demo_completed"], relationship_signals=["strong_value_fit"]),

    make_event("meenakshi_exports", "Customer",
        "Proposal sent: ₹1.8L for customs + GST module. She asked for a discount. "
        "We offered 10% if signed within 2 weeks.",
        "neutral", "positive", 0.4, days_ago(72),
        promises=[make_promise("10% discount if contract signed within 2 weeks",
                               "discount", "us", days_ago(58), 0.6)],
        erp_tags=["proposal_sent", "discount_offered"], relationship_signals=["price_sensitivity"]),

    make_event("meenakshi_exports", "Customer",
        "She said she needs to discuss with her CA. Fair enough. Will follow up next week.",
        "neutral", "neutral", 0.0, days_ago(65),
        erp_tags=["follow_up_scheduled"], relationship_signals=["decision_pending"]),

    make_event("meenakshi_exports", "Customer",
        "Left voicemail. No callback. Sent email — no response. "
        "Discount deadline has passed. Not sure what happened.",
        "negative", "negative", -0.5, days_ago(52),
        erp_tags=["follow_up", "no_response"], relationship_signals=["going_dark"]),

    make_event("meenakshi_exports", "Customer",
        "Final attempt — WhatsApp message. Read receipt but no reply. "
        "Marking as churned for now. May have gone with a competitor or decided not to buy.",
        "negative", "negative", -0.6, days_ago(45),
        erp_tags=["churned"], relationship_signals=["lost_deal", "churn_confirmed"]),
]

# ── 5. Vikram Tech Solutions — PROSPECT, proposal sent, no response 12 days ───
SEED_EVENTS += [
    make_event("vikram_tech_solutions", "Customer",
        "Met Vikram Nair at a Pune startup networking event. He runs a 30-person IT services firm, "
        "needs project billing + resource allocation tracking. Swapped contacts.",
        "positive", "positive", 0.6, days_ago(25),
        erp_tags=["networking", "lead"], relationship_signals=["interest_expressed"]),

    make_event("vikram_tech_solutions", "Customer",
        "Discovery call — 45 minutes. Vikram is the decision maker. "
        "Current setup is Jira + manual Excel billing. Huge inefficiency. Clear ROI story.",
        "positive", "positive", 0.75, days_ago(18),
        erp_tags=["discovery_call"], relationship_signals=["strong_fit", "decision_maker_engaged"]),

    make_event("vikram_tech_solutions", "Customer",
        "Sent proposal: ₹95K for project billing module with Jira integration. "
        "Vikram acknowledged receipt. Said he'd review over the weekend and get back Monday.",
        "neutral", "positive", 0.3, days_ago(12),
        promises=[make_promise("Vikram to review proposal and respond by Monday",
                               "callback", "customer", days_ago(9), 0.8)],
        erp_tags=["proposal_sent"], relationship_signals=["decision_pending"]),
]

# ── 6. Ananya Foods Pvt — TRUSTED, healthy, minor open promise ────────────────
SEED_EVENTS += [
    make_event("ananya_foods_pvt", "Customer",
        "Ananya Foods has been with us for 8 months. Quarterly review call today. "
        "Very happy with the inventory module — saved 3 FTEs worth of manual work.",
        "positive", "positive", 0.9, days_ago(45),
        erp_tags=["qbr", "renewal"], relationship_signals=["high_satisfaction", "expansion_potential"]),

    make_event("ananya_foods_pvt", "Customer",
        "They want to expand — add the vendor payment module for managing 80+ suppliers. "
        "Ananya (founder) personally asked for a demo. Great upsell opportunity.",
        "positive", "positive", 0.85, days_ago(35),
        erp_tags=["upsell", "demo_request"], relationship_signals=["expansion_interest"]),

    make_event("ananya_foods_pvt", "Customer",
        "Demo of vendor payment module done. Ananya loved the WhatsApp payment notification feature. "
        "She asked us to prepare an add-on quote by end of week.",
        "positive", "positive", 0.9, days_ago(28),
        promises=[make_promise("Send vendor payment module add-on quote by end of week",
                               "proposal", "us", days_ago(21), 0.7)],
        erp_tags=["demo_completed"], relationship_signals=["strong_intent"]),

    make_event("ananya_foods_pvt", "Customer",
        "Sent add-on quote: ₹60K for vendor payment module. Annual renewal also due next month — "
        "they've already confirmed renewal verbally. Waiting on PO.",
        "positive", "positive", 0.8, days_ago(20),
        promises=[make_promise("Annual renewal PO to be issued by Ananya Foods next month",
                               "payment", "customer", days_ago(-10), 0.7)],
        erp_tags=["quote_sent", "renewal_confirmed"], relationship_signals=["strong_relationship"]),

    make_event("ananya_foods_pvt", "Customer",
        "Check-in call — all good. Ananya mentioned they're hiring a new finance head "
        "who will be our main point of contact going forward. Asked us to set up an intro call.",
        "positive", "positive", 0.75, days_ago(8),
        promises=[make_promise("Set up intro call between our team and new Ananya Foods finance head",
                               "meeting", "us", days_ago(3), 0.6)],
        erp_tags=["relationship_maintenance"], relationship_signals=["stakeholder_change"]),
]


# ── 7. Noise Corp — High noise, perfect for Memify ────────────────────────────
SEED_EVENTS += [
    make_event("noise_corp", "Customer",
        "Left voicemail.",
        "neutral", "neutral", 0.0, days_ago(10),
        erp_tags=["voicemail"]),
    make_event("noise_corp", "Customer",
        "Follow up email sent. Automated reply received.",
        "neutral", "neutral", 0.0, days_ago(9),
        erp_tags=["email"]),
    make_event("noise_corp", "Customer",
        "Saw them post on LinkedIn, liked the post.",
        "neutral", "neutral", 0.0, days_ago(8),
        erp_tags=["social"]),
    make_event("noise_corp", "Customer",
        "Sent regular newsletter. Opened.",
        "neutral", "neutral", 0.0, days_ago(7),
        erp_tags=["marketing"]),
    make_event("noise_corp", "Customer",
        "Just a generic touchpoint. No response.",
        "neutral", "neutral", 0.0, days_ago(6),
        erp_tags=["touchpoint"]),
]

# ── 8. Abandoned Ltd — CHURNED, perfect for Forget ──────────────────────────
SEED_EVENTS += [
    make_event("abandoned_ltd", "Customer",
        "Initial contact made.",
        "positive", "positive", 0.5, days_ago(100),
        erp_tags=["lead"]),
    make_event("abandoned_ltd", "Customer",
        "They decided to go with a competitor due to pricing.",
        "negative", "negative", -0.8, days_ago(90),
        erp_tags=["churned"], relationship_signals=["lost_deal", "churn_confirmed"]),
]


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Mnemos Demo Seeder")
    print("=" * 60)

    # 1. Init schema
    print("\n[seed] Initializing database schema...")
    init_db()

    # 2. Wipe existing data
    print("[seed] Wiping existing data...")
    storage.clear_all()

    # Also wipe agent_state so last_scan resets cleanly
    with db_session() as conn:
        conn.execute("DELETE FROM agent_state")
        conn.execute("DELETE FROM cognee_retry")
    print("[seed] Database cleared.")

    # 3. Insert seed events
    print(f"\n[seed] Inserting {len(SEED_EVENTS)} events across 6 entities...")
    entity_counts: dict[str, int] = {}

    for event_dict in SEED_EVENTS:
        event = build_event(event_dict)
        save_event(event)
        eid = event.customer_or_vendor_id
        entity_counts[eid] = entity_counts.get(eid, 0) + 1

    print("\n[seed] Events inserted per entity:")
    for entity_id, count in entity_counts.items():
        print(f"  {entity_id:<30} {count} events")

    # 4. Verify
    with db_session() as conn:
        total = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        entities = conn.execute("SELECT COUNT(DISTINCT entity_id) FROM events").fetchone()[0]
        open_promises = conn.execute(
            "SELECT COUNT(*) FROM events WHERE payload LIKE '%\"resolved\": false%'"
        ).fetchone()[0]

    print(f"\n[seed] Verification:")
    print(f"  Total events    : {total}")
    print(f"  Entities        : {entities}")

    # Seed conflict data for demo
    from datetime import timezone
    import logging
    try:
        with db_session() as conn:
            conn.execute(
                """INSERT INTO conflicts 
                   (entity_id, attribute_type, source_a, value_a, event_id_a,
                    source_b, value_b, event_id_b, detected_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("rajesh_textiles", "delivery_date", "WhatsApp", "Tuesday July 7", 1,
                 "Invoice (Tally)", "Friday July 10", 2, datetime.now(timezone.utc).isoformat())
            )
            conn.execute(
                """INSERT INTO conflicts 
                   (entity_id, attribute_type, source_a, value_a, event_id_a,
                    source_b, value_b, event_id_b, detected_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("ananya_foods_pvt", "payment_amount", "Purchase Order", "450000 INR", 5,
                 "Invoice", "525000 INR", 8, datetime.now(timezone.utc).isoformat())
            )
        print("Seeded 2 conflict records")
    except Exception as e:
        print(f"Could not seed conflicts: {e}")

    print("\n[seed] Done. Start your server and hit /entities and /alerts.")
    print("       Expected: rajesh_textiles and priya_pharma show high entropy alerts.")
    print("       Expected: meenakshi_exports shows CHURNED state.")
    print("       Expected: ananya_foods_pvt shows TRUSTED with low-urgency open promise.")
    print("=" * 60)


if __name__ == "__main__":
    main()
