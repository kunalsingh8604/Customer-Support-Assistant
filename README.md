# Customer Support Assistant

**AGGROSO Option A — Knowledge-Grounded Customer Support Assistant**

An internal support workspace where agents create tickets, run AI analysis grounded in a markdown knowledge base, and **manually approve or reject** draft responses and suggested actions before anything is sent.

[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black)](https://your-vercel-url.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7)](https://customer-support-assistant-api.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-kunalsingh8604-181717)](https://github.com/kunalsingh8604/Customer-Support-Assistant)

---

## Overview

Customer Support Assistant is a full-stack agent workspace for handling support tickets with AI assistance. Agents capture customer context, trigger a single structured Groq/Llama analysis against a local knowledge base, then review classification, missing information, follow-up questions, a draft reply, and a suggested action. Every AI output stays in draft form until a human approves or rejects it — nothing is auto-sent or auto-executed.

---

## Live Demo

| Resource | URL |
|----------|-----|
| **Frontend** | [https://your-vercel-url.vercel.app](https://your-vercel-url.vercel.app) |
| **Backend API** | [https://customer-support-assistant-api.onrender.com](https://customer-support-assistant-api.onrender.com) |
| **Health check** | [https://customer-support-assistant-api.onrender.com/health](https://customer-support-assistant-api.onrender.com/health) |
| **GitHub** | [kunalsingh8604/Customer-Support-Assistant](https://github.com/kunalsingh8604/Customer-Support-Assistant) |

> **Note:** Free Render services may cold-start after idle time. The first API request can take 30–60 seconds.

---

## Architecture

```
Browser (Vercel)
  React + Vite + Tailwind + React Query
            |
            | HTTPS  (VITE_API_URL)
            v
API (Render)
  Express + Winston + better-sqlite3
            |
            +--> SQLite  (/tmp/support.db on Render)
            +--> /server/kb/*.md  (knowledge base)
            +--> Groq API  (Llama 70B, structured JSON)
```

### Four layers

| Layer | Stack | Host |
|-------|--------|------|
| **Frontend** | React + Vite + Tailwind CSS + React Query + React Router | Vercel |
| **Backend** | Node.js + Express REST API + Winston structured logging | Render |
| **AI layer** | Groq API — Llama 70B (`llama-3.3-70b-versatile`; assignment originally specified `llama-3.1-70b-versatile`, which Groq decommissioned) with structured JSON output | Groq free tier |
| **Data** | SQLite via better-sqlite3 + 6 Markdown KB articles under `/server/kb/` | Local / Render `/tmp` |

### Folder structure

```
/
├── client/                         # Vercel frontend
│   ├── src/
│   │   ├── components/             # Badges, Layout, States, TicketForm
│   │   ├── pages/                  # TicketListPage, TicketDetailPage, NewTicketPage
│   │   ├── api/                    # tickets.js (API client for React Query)
│   │   ├── config/                 # api.js (VITE_API_URL base URL)
│   │   ├── utils/                  # format helpers
│   │   └── tests/                  # Vitest + React Testing Library
│   ├── vercel.json
│   └── .env.example
│
├── server/                         # Render backend
│   ├── index.js                    # Entry: PORT, DB_PATH, SIGTERM shutdown
│   ├── routes/                     # tickets.js, ai.js
│   ├── services/                   # ticketService, aiOrchestrator, kbLoader
│   ├── db/                         # schema.js (SQLite init)
│   ├── kb/                         # Markdown knowledge base
│   │   ├── billing/                # payment-failures, refund-policy
│   │   ├── account/                # login-issues, password-reset
│   │   └── technical/              # api-errors, integration-guide
│   ├── middleware/                 # requestLogger
│   ├── utils/                      # Winston logger
│   ├── tests/                      # Vitest + Supertest
│   └── .env.example
│
├── render.yaml
├── AGENT_USAGE.md
└── README.md
```

---

## Features

- **Ticket intake** — customer type, product area, issue description, previous communication, optional urgency
- **Knowledge-grounded AI** — KB articles retrieved by keyword search, then one Groq completion
- **Structured AI output** — classification, missing info, follow-up questions, draft response, suggested action, citations
- **Human-in-the-loop** — approve / reject response and action; nothing auto-sends
- **History timeline** — created, AI analyzed, status changes, approvals/rejections
- **Status workflow** — `open` → `in-review` (after analysis) → agent sets `resolved` / `closed`
- **Structured logging** — Winston JSON logs (HTTP, AI duration/tokens, KB search, errors)
- **Tests** — server (Vitest + Supertest) and client (Vitest + RTL)

---

## Tech stack

| Area | Technology |
|------|------------|
| Frontend | React 18, Vite, Tailwind CSS, React Query, React Router |
| Backend | Node.js, Express, better-sqlite3, Winston, dotenv |
| AI | Groq SDK — `llama-3.3-70b-versatile` (override with `GROQ_MODEL`) |
| Knowledge base | 6 Markdown files with YAML frontmatter |
| Testing | Vitest, Supertest, React Testing Library |
| Deploy | Vercel (UI), Render (API) |

---

## Getting started (local)

### Prerequisites

- Node.js **18+**
- npm
- A free [Groq API key](https://console.groq.com/keys)

### 1. Clone

```bash
git clone https://github.com/kunalsingh8604/Customer-Support-Assistant.git
cd Customer-Support-Assistant
```

### 2. Environment files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` and set your real key:

```env
GROQ_API_KEY=gsk_your_real_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3001
DB_PATH=./data/support.db
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

`client/.env` (local default):

```env
VITE_API_URL=http://localhost:3001
```

### 3. Install

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 4. Run the full app

From the **project root**:

```bash
npm run dev
```

| App | URL |
|-----|-----|
| Frontend UI | [http://localhost:5173](http://localhost:5173) |
| Backend API | [http://localhost:3001](http://localhost:3001) |
| Health | [http://localhost:3001/health](http://localhost:3001/health) |

Run sides separately if needed:

```bash
npm run dev:server
npm run dev:client
```

---

## API reference

Base path: `/api/tickets`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tickets` | Create ticket |
| `GET` | `/api/tickets` | List tickets |
| `GET` | `/api/tickets/:id` | Get ticket (+ latest AI result) |
| `PATCH` | `/api/tickets/:id/status` | Update status |
| `GET` | `/api/tickets/:id/history` | Event history |
| `POST` | `/api/tickets/:id/analyze` | Run AI workflow (no auto-approve) |
| `POST` | `/api/tickets/:id/approve-response` | Approve draft response |
| `POST` | `/api/tickets/:id/reject-response` | Reject draft (`{ "reason": "..." }`) |
| `POST` | `/api/tickets/:id/approve-action` | Approve suggested action |
| `POST` | `/api/tickets/:id/reject-action` | Reject suggested action |

`GET /health` → `{ "status": "ok" }`

---

## AI workflow

1. Agent creates a ticket.
2. Agent clicks **Run AI Analysis**.
3. Server searches `/server/kb` (no cache) and sends ticket + articles to Groq in **one** structured JSON call.
4. Result is saved; status moves `open` → `in-review`.
5. Agent reviews draft response and suggested action, then **Approve** or **Reject**.
6. History records every event. **Nothing is sent automatically.**

Draft responses are grounded in provided KB articles only; if coverage is missing, the model must say so explicitly.

---

## Knowledge base

| Area | Articles |
|------|----------|
| Billing | `payment-failures.md`, `refund-policy.md` |
| Account | `login-issues.md`, `password-reset.md` |
| Technical | `api-errors.md`, `integration-guide.md` |

Each file uses YAML frontmatter (`title`, `product_area`, `tags`) plus agent-oriented content. Drop new `.md` files under `/server/kb/` — they are reloaded on every search.

---

## Testing

```bash
npm test                 # all
npm run test:server      # API + KB + mocked Groq analyze
npm run test:client      # TicketForm, TicketDetail, StatusBadge
npm run test:coverage    # coverage reports
```

---

## Deployment

### Backend (Render)

Configured via `render.yaml`:

- Build: `cd server && npm install`
- Start: `cd server && node index.js`
- `DB_PATH=/tmp/support.db` (writable on Render)
- Set secrets: `GROQ_API_KEY`, `CORS_ORIGIN` (your Vercel origin)

### Frontend (Vercel)

- Root directory: `client`
- Framework: Vite (`client/vercel.json`)
- Env: `VITE_API_URL=https://customer-support-assistant-api.onrender.com`

---

## Environment variables

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key (required for analyze) |
| `GROQ_MODEL` | Model id (default `llama-3.3-70b-versatile`) |
| `PORT` | HTTP port (default `3001`) |
| `DB_PATH` | SQLite path |
| `NODE_ENV` | `development` / `production` / `test` |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL (no trailing slash) |

---

## Known limitations

- SQLite on Render `/tmp` is **ephemeral** — data resets when the free instance recycles.
- Free Render **cold starts** can delay the first request.
- Groq **free-tier rate limits** apply.
- KB retrieval is **keyword-based**, not vector embeddings.
- **No authentication** — suitable as a demo, not a public multi-tenant product.
- `llama-3.1-70b-versatile` was **decommissioned by Groq**; the app uses `llama-3.3-70b-versatile` (configurable).

---

## Intentionally excluded

| Excluded | Why |
|----------|-----|
| User auth / RBAC | Out of scope for the assignment demo |
| Managed Postgres | Requirement was single-file SQLite |
| Auto-send email/chat | Human-in-the-loop: never auto-approve |
| Vector RAG database | Markdown + keyword search meets free-tier scope |
| WebSockets | REST + React Query is enough |

---

## Agent usage

See [AGENT_USAGE.md](./AGENT_USAGE.md) for tools used, AI-generated portions, prompts, corrections, and verification steps.

---

## Author



Assignment: **AGGROSO Option A — Knowledge-Grounded Customer Support Assistant**
