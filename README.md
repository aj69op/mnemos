# Mnemos — Proactive ERP Relationship Intelligence Agent

> **"Most ERP AI tools are sandboxed to their own data. Mnemos isn't."**

Mnemos ingests interactions from disconnected business systems (Tally, Zoho CRM, email, WhatsApp notes), builds a unified temporal knowledge graph, and proactively fires alerts *before* relationships break — not after.

**[Live Demo →](https://mnemos-production-4501.up.railway.app)**  &nbsp;|&nbsp;  **[API Docs →](https://mnemos-production-4501.up.railway.app/docs)**  &nbsp;|&nbsp;  **[Health →](https://mnemos-production-4501.up.railway.app/health)**

---

## Why this is hard

Every major ERP vendor (Zoho, Tally, SAP) has added AI — but it's siloed. Zoho AI only knows your CRM data. Tally AI only knows your invoices. If a customer promised to pay on Tuesday in a WhatsApp call, then raised a complaint via email, then went silent for 10 days — **no existing tool connects those dots.**

Mnemos does three things none of them do together:

1. **Cross-system ingest** — raw text (emails, call notes, WhatsApp, CSV exports) is classified into a strict ERP schema by Gemini, extracting sentiment, relationship signals, and explicit promises with due dates and owners.

2. **Temporal knowledge graph** — every interaction is pushed into [cognee](https://github.com/topoteretes/cognee), which builds a graph of entities, relationships, and commitments that can be queried in plain English across all sources simultaneously.

3. **Continuous commitment decay** — a background agent scores every open promise using an entropy formula. When a payment promise is 8 days overdue with no resolution, you get an alert. You don't have to remember to check.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mnemos Backend                           │
│                                                                 │
│  POST /ingest ──► Gemini (extract) ──► SQLite ──► cognee graph │
│                                            │                    │
│  POST /query  ◄── cognee INSIGHTS ◄────────┤                    │
│                   (or Gemini fallback)     │                    │
│                                            │                    │
│  Background Agent (every 60s)             │                    │
│    ├── Entropy Engine ◄── open promises ◄──┘                    │
│    ├── Silence Gap Detector                                     │
│    └── Sentiment Drift Detector                                 │
│              │                                                  │
│              ▼                                                  │
│         SQLite alerts table (persistent across restarts)        │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  Next.js Dashboard              GET /alerts
  (AlertCard, EntropyBar,        GET /entities
   TimelineView, QueryBox)       GET /customer/{id}/timeline
```

### The entropy formula

```
entropy(promise) = (days_elapsed / expected_resolution_days) × urgency_weight

Alert thresholds:
  > 0.5  →  medium   (plan a follow-up)
  > 0.8  →  high     (needs attention now)
  > 1.2  →  critical (relationship damage likely)
```

Each promise type has a calibrated `expected_resolution_days` (payment: 3 days, delivery: 5, callback: 1) and `urgency_weight`. Scores are frozen at alert-creation time so you can audit *why* an alert fired, even after the promise resolves.

### AI fallback chain

```
gemini-2.5-flash
  │ quota/429 → 60s cooldown, skip
gemini-2.0-flash
  │ quota/429 → 60s cooldown, skip
gemini-2.0-flash-lite
  │ quota/429 → 60s cooldown, skip
gemini-1.5-flash
  │ 5xx/network → exponential backoff (1s, 2s), retry same model
  │ all exhausted ↓
groq/llama-3.3-70b-versatile
  │ all exhausted ↓
RuntimeError (surfaces to caller with full context)
```

Per-model cooldowns are in-process state — exhausted models are skipped *immediately* on subsequent calls rather than re-discovering the 429 by timing out. Visible at `/health` under `ai.models_on_cooldown`.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | FastAPI + Python 3.11 | Async, type-safe, auto-docs |
| Storage | SQLite + WAL mode | Multi-worker safe, zero infra |
| Knowledge Graph | cognee (cloud) | Temporal graph + hybrid retrieval |
| AI | Gemini 2.5/2.0/1.5 + Groq | Free tier cascade, no single point of failure |
| Frontend | Next.js 14 + TypeScript | Type-safe, fast |
| Background Jobs | APScheduler | In-process, no Redis needed for MVP |
| Deployment | Railway + persistent volume | One-command deploy, DB survives redeploys |

---

## Live Demo

The demo is seeded with 6 fictional Indian SME entities across different relationship states:

| Entity | State | Story |
|---|---|---|
| `rajesh_textiles` | TRUSTED | ₹1.2L payment overdue by 18 days — high entropy alert |
| `priya_pharma` | AT_RISK | 3 consecutive negative interactions — sentiment drift alert |
| `suresh_logistics` | ENGAGED | Active pilot, deal progressing |
| `meenakshi_exports` | CHURNED | Went silent 45 days ago after discount expired |
| `vikram_tech_solutions` | PROSPECT | Proposal sent 12 days ago, no response |
| `ananya_foods_pvt` | TRUSTED | Healthy — upsell quote open, renewal confirmed |

**Read endpoints are open. Write endpoints are disabled in demo mode.**

Try these:
```bash
# See all entities and their relationship states
curl https://mnemos-production-4501.up.railway.app/entities

# See active alerts sorted by entropy
curl https://mnemos-production-4501.up.railway.app/alerts

# Natural language query over Rajesh's history
curl -X POST https://mnemos-production-4501.up.railway.app/query \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "rajesh_textiles", "query": "What payment commitments are outstanding and how overdue are they?"}'

# Full interaction timeline
curl https://mnemos-production-4501.up.railway.app/customer/rajesh_textiles/timeline
```

---

## Local Setup

```bash
# 1. Clone and install
git clone https://github.com/aj69op/mnemos
cd mnemos
pip install -r requirements.txt

# 2. Set environment variables
cp .env.example .env
# Add: GEMINI_API_KEY, GROQ_API_KEY, COGNEE_API_KEY, COGNEE_TENANT_ID

# 3. Seed demo data
python seed_demo.py

# 4. Start backend
uvicorn main:app --reload

# 5. Start frontend
cd frontend && npm install && npm run dev
```

Backend: `http://localhost:8000`  
Frontend: `http://localhost:3000`  
API Docs: `http://localhost:8000/docs`

---

## Key Engineering Decisions

**Why SQLite over PostgreSQL?**  
WAL mode + `busy_timeout=5000ms` handles multi-worker concurrent reads safely and serializes writes without corruption. For a single-instance Railway deployment, this is zero-infra and zero-cost. The schema is designed to migrate to Postgres with minimal changes when needed.

**Why freeze entropy scores at alert time?**  
If scores were computed on-read, you couldn't audit "why did this alert fire?" after the promise resolves. Frozen scores also mean the `occurred_at` vs `ingested_at` column split matters — `occurred_at` is the source timestamp (validated at ingest with a hard 422 on bad dates), `ingested_at` is when SQLite saw the row. Entropy is computed from `occurred_at`.

**Why per-model cooldowns instead of a global retry?**  
Gemini quota limits are per-model, not global. `gemini-2.0-flash` and `gemini-2.0-flash-lite` have separate quota buckets. A global "Gemini is down" flag would unnecessarily skip available models. The cooldown dict tracks exhaustion per-model so each request uses the best available option.

**Why no Redis for the background agent?**  
The agent writes to SQLite tables (`alerts`, `state_changes`, `agent_state`). For a single-instance deployment, this is correct. When/if horizontal scaling is needed, the migration path is: replace APScheduler with a Celery worker + Redis broker, keep the SQLite reads, move writes to Postgres. No application logic changes.

---

## Project Structure

```
mnemos/
├── main.py              # FastAPI routes + lifespan
├── agent_loop.py        # APScheduler background agent
├── entropy_engine.py    # Commitment decay formula + alert generation
├── erp_schema.py        # Data models + Gemini extraction prompts
├── storage.py           # SQLite CRUD (events, alerts, state)
├── db.py                # Connection factory, WAL config, schema
├── ai_client.py         # Multi-provider fallback chain with cooldowns
├── demo_gate.py         # Read-only demo mode middleware
├── seed_demo.py         # Demo data seeder
└── frontend/            # Next.js dashboard
    └── src/
        ├── components/
        │   ├── AlertCard.tsx      # SLA breach alert UI
        │   ├── EntropyBar.tsx     # Commitment decay visualizer
        │   ├── QueryBox.tsx       # Natural language query input
        │   ├── StateBadge.tsx     # Relationship state badge
        │   └── TimelineView.tsx   # Chronological interaction view
        └── app/
            ├── page.tsx                    # Main dashboard
            ├── customer/[id]/page.tsx      # Entity profile
            └── import/page.tsx             # CSV import UI
```

---

## What's Next

- [ ] Real CDC bridge — Debezium connectors for live Tally/Zoho ingest
- [ ] Vector similarity for the Gemini fallback (replace sliding window with FAISS)
- [ ] Multi-tenant auth (currently single-org)
- [ ] Webhook notifications for critical alerts (Slack / WhatsApp Business API)

---

*Built by Arkajit Chowdhury · [LinkedIn](https://www.linkedin.com/in/arkajit-chowdhury-61427131b/)*
