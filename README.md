# Mnemos

**Proactive Relationship Intelligence Agent for ERP Systems**

[![Live Demo](https://img.shields.io/badge/demo-live-0A3020?style=for-the-badge)](https://mnemos-frontend-gamma.vercel.app)
[![API Docs](https://img.shields.io/badge/API-docs-0A3020?style=for-the-badge)](https://mnemos-production-4501.up.railway.app/docs)
[![Backend Health](https://img.shields.io/badge/health-check-0A3020?style=for-the-badge)](https://mnemos-production-4501.up.railway.app/health)
[![License](https://img.shields.io/badge/license-MIT-0A3020?style=for-the-badge)](LICENSE)
[![Demo Video](https://img.shields.io/badge/demo-video-0A3020?style=for-the-badge)](https://youtu.be/VDJvDGWKYG0)

---

Mnemos is an open-source AI agent that ingests raw business interactions — WhatsApp notes, CRM logs, emails, call transcripts — and builds a **living knowledge graph** of your vendor and customer relationships. It tracks every promise, detects sentiment drift, and fires proactive alerts **before** a deal sours or a payment slips.

> **Every ERP vendor has added AI. But Zoho AI only knows Zoho. Tally AI only knows Tally. Mnemos connects the dots across all of them.**

---

## The Problem

Your business conversations are scattered across WhatsApp, email, Zoho CRM, Tally invoices, and Slack. When a customer promises payment on a WhatsApp call, then raises a complaint via email, then goes silent — **no existing tool connects those dots.** By the time you realize the relationship is damaged, the customer has already churned.

## What Mnemos Does Differently

| Capability | Mnemos | Traditional CRM/ERP AI |
|---|---|---|
| **Cross-system ingest** | Raw text from any source → structured promises, sentiment, signals | Siloed to one system (Zoho AI, Tally AI, etc.) |
| **Temporal knowledge graph** | Entity-relationship graph with time-aware querying | Flat tables or siloed databases |
| **Proactive alerts** | Entropy-driven commitment decay engine fires alerts *before* relationships break | Reactive dashboards you must manually check |
| **Multi-LLM resilience** | 5-model fallback chain (Gemini → Groq) with per-model cooldowns | Single LLM = single point of failure |
| **Promise tracking** | Auto-extracts promises with due dates, urgency weights, ownership | No structured promise tracking |
| **Zero-infra storage** | SQLite with WAL mode — no database server needed | Requires PostgreSQL, Redis, etc. |

---

## Cool Features

### 🧠 Multi-Layer AI Fallback Chain
No single point of failure. Mnemos cascades through 4 Gemini models → Groq → regex fallback, with per-model cooldown tracking so exhausted models are skipped instantly — not rediscovered by timing out.

```
gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite → gemini-1.5-flash → groq/llama-3.3-70b → regex fallback
```

### ⏳ Entropy-Powered Alert Engine
Every promise decays over time. Mnemos computes a **commitment entropy score** using:
```
entropy = (days_elapsed / expected_resolution_days) × urgency_weight
```
When entropy crosses thresholds, alerts fire automatically. Scores are **frozen at alert time** so you can always audit *why* an alert fired, even after the promise is resolved.

### 🕸️ Temporal Knowledge Graph (Cognee)
Every interaction becomes a node in a graph with relationships, entities, and commitments. Query across entities in natural language:
> *"What payment commitments are outstanding across all vendors and how overdue are they?"*

### 🔄 Relationship State Machine
Entities automatically transition between 5 lifecycle states based on signal history:

`PROSPECT → ENGAGED → TRUSTED` or `→ AT_RISK → CHURNED`

The state machine weighs sentiment, promise resolution rate, escalation frequency, and churn signals — not a single metric.

### 🔍 Cross-Entity Conflict Detection
When the same entity has conflicting information across sources (e.g., WhatsApp says "payment made" but Tally says "overdue"), Mnemos flags it automatically.

### ⚡ AI-Free CSV Import
Bulk-import 100+ rows of interaction data **instantly** with keyword-based classification — zero API calls, zero rate limits.

### 🧹 Memory Management
Low-signal events (neutral type, neutral sentiment, no promises) are auto-pruned to keep the working graph sharp and relevant.

### 🔇 Gemini Noise Suppression
OS-level stderr redirection silences Gemini SDK's C-extension noise (`fprintf` bypasses Python's `sys.stderr`). Your console stays clean.

---

## Live Demo

**Frontend:** https://mnemos-frontend-gamma.vercel.app
**Backend:** https://mnemos-production-4501.up.railway.app
**API Docs:** https://mnemos-production-4501.up.railway.app/docs

The demo is seeded with 20+ entities across all relationship states with 80+ real-world interaction scenarios.

```bash
# See all entities and their relationship states
curl https://mnemos-production-4501.up.railway.app/entities

# See proactive alerts sorted by entropy
curl https://mnemos-production-4501.up.railway.app/alerts

# Natural language query over entity history
curl -X POST https://mnemos-production-4501.up.railway.app/query \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "acme_corp", "query": "What payments are overdue?"}'

# Cross-entity query
curl -X POST https://mnemos-production-4501.up.railway.app/query-cross-entity \
  -H "Content-Type: application/json" \
  -d '{"query": "Which entities are at risk right now?"}'
```

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Mnemos Backend                            │
│                                                                    │
│  ┌──────────┐    ┌──────────────┐    ┌────────┐    ┌───────────┐  │
│  │   HTTP    │───►│  Classifier  │───►│ SQLite │───►│  Cognee   │  │
│  │  Routes   │    │ (AI + regex) │    │ (WAL)  │    │   Graph   │  │
│  └──────────┘    └──────────────┘    └────────┘    └───────────┘  │
│                        │                              │           │
│                        ▼                              ▼           │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │              Background Agent (every 60s)                 │     │
│  │  ┌────────────┐  ┌───────────────┐  ┌────────────────┐   │     │
│  │  │   Entropy  │  │  Silence Gap  │  │  Sentiment     │   │     │
│  │  │   Engine   │  │  Detector     │  │  Drift Monitor │   │     │
│  │  └────────────┘  └───────────────┘  └────────────────┘   │     │
│  │                    │                                      │     │
│  │                    ▼                                      │     │
│  │              ┌──────────────┐                             │     │
│  │              │  Alerts Table│  (persistent, frozen)       │     │
│  │              └──────────────┘                             │     │
│  └──────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
    Next.js Dashboard              REST API
    (Alerts, Timeline,             (GET /alerts, POST /query,
     Import, Entities,              GET /entities, POST /ingest,
     Graph, Memify)                 POST /import-csv, etc.)
```

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | FastAPI + Python 3.11 | Async, auto-docs, type-safe |
| **Storage** | SQLite + WAL mode | Zero-infra, multi-worker safe, migrates to Postgres |
| **Knowledge Graph** | Cognee Cloud | Temporal graph with hybrid retrieval |
| **AI** | Gemini 2.5/2.0/1.5 + Groq + Regex | 5-tier fallback, no single point of failure |
| **Frontend** | Next.js 14 + TypeScript + Tailwind | Modern, fast, type-safe |
| **Background Jobs** | APScheduler | In-process, no Redis needed |
| **Deployment** | Railway + Vercel | One-command backend + edge frontend |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/aj69op/mnemos
cd mnemos

# 2. Backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env: add your GEMINI_API_KEY, GROQ_API_KEY, COGNEE_API_KEY, COGNEE_TENANT_ID
uvicorn main:app --reload

# 3. Frontend
cd frontend
npm install
npm run dev
```

Backend: `http://localhost:8000`  
Frontend: `http://localhost:3000`

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ingest` | Ingest a raw interaction note |
| `POST` | `/import-csv` | Bulk import CSV (AI-free, instant) |
| `POST` | `/query` | Natural language query over an entity |
| `POST` | `/query-cross-entity` | Query across multiple entities |
| `GET` | `/entities` | List all entities + states |
| `GET` | `/alerts` | Active proactive alerts |
| `GET` | `/conflicts` | Cross-source conflict list |
| `GET` | `/customer/{id}/timeline` | Full interaction timeline |
| `GET` | `/customer/{id}/commitments` | Open promises + entropy scores |
| `GET` | `/entropy/live` | Live entropy scores |
| `POST` | `/draft-followup` | AI-drafted follow-up message |
| `GET` | `/health` | Service health + AI model status |
| `POST` | `/memify` | Prune low-signal memories |
| `POST` | `/forget` | Soft-delete an entity |

---

## Project Structure

```
mnemos/
├── main.py              # FastAPI routes (12 endpoints)
├── ai_client.py         # Multi-LLM fallback with cooldowns
├── erp_schema.py        # Data models + extraction prompts
├── entropy_engine.py    # Commitment decay + alert generation
├── agent_loop.py        # Background proactive agent
├── conflict_detector.py # Cross-source conflict detection
├── storage.py           # SQLite CRUD layer
├── db.py                # Connection factory + schema
├── fast_import_csv.py   # AI-free bulk CSV import
├── demo_gate.py         # Read-only demo mode
├── seed_demo.py         # Demo data seeder
├── skills/              # Cognee skill integrations
├── frontend/
│   ├── src/app/         # Dashboard pages
│   │   ├── dashboard/page.tsx              # Main dashboard
│   │   ├── dashboard/customer/[id]/page.tsx # Entity profile
│   │   ├── dashboard/entities/page.tsx     # Entity list
│   │   ├── dashboard/import/page.tsx       # CSV import UI
│   │   ├── dashboard/graph/page.tsx        # Knowledge graph
│   │   └── dashboard/memify/page.tsx       # Memory management
│   └── src/lib/
│       └── api.ts      # API client (proxied via /api/* rewrites)
```

---

## Engineering Decisions

**SQLite over PostgreSQL?**  
WAL mode + `busy_timeout=5000ms` handles concurrent reads safely and serializes writes without corruption. For single-instance deployments, this is zero-infra and zero-cost. The schema is designed for a straight-forward Postgres migration when needed.

**Frozen entropy scores?**  
Scores are computed at alert-creation time, not on-read. This means you can audit *why* a critical alert fired weeks later, even after the promise was resolved. `occurred_at` (source timestamp) drives entropy; `ingested_at` (wall clock) drives ordering.

**Per-model cooldowns?**  
Gemini's free-tier quota is per-model, not global. A global "Gemini is down" flag would skip `gemini-2.0-flash-lite` even when only `gemini-2.5-flash` is exhausted. Per-model tracking uses every available token.

**No Redis?**  
The background agent writes to SQLite tables directly. For horizontal scaling, replace APScheduler with Celery + Redis broker, keep reads on SQLite, move writes to Postgres. No application logic changes.

---

## Roadmap

- [x] Cross-system ingest (any text → structured ERP events)
- [x] Temporal knowledge graph with natural language query
- [x] Entropy-driven proactive alerts
- [x] Multi-LLM fallback chain with cooldowns
- [x] Bulk CSV import (AI-free)
- [x] Relationship state machine
- [x] Conflict detection
- [ ] CDC connectors for live Tally / Zoho ingest
- [ ] Slack / WhatsApp Business API webhook notifications
- [ ] Multi-tenant auth
- [ ] Vector similarity for LLM fallback (replace sliding window with FAISS)

---

## AI Assistance Disclosure

This project was developed with AI-assisted tooling. Claude (by Antropic) was used for code generation, refactoring, debugging, and documentation writing under the direction of the human author. All architectural decisions, business logic, and quality control were reviewed and approved by the human author. In accordance with the hackathon rules, AI assistance is disclosed here.

## Team

Built by **[Arkajit Chowdhury](https://www.linkedin.com/in/arkajit-chowdhury-61427131b/)** — product engineer specializing in AI-powered developer tools and ERP intelligence systems.

---

<p align="center">
  <a href="https://mnemos-frontend-gamma.vercel.app">Live Demo</a> ·
  <a href="https://github.com/aj69op/mnemos">GitHub</a> ·
  <a href="https://mnemos-production-4501.up.railway.app/docs">API Docs</a>
</p>
