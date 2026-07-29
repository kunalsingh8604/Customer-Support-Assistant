# Customer Support Assistant

Full-stack customer support ticket assistant with a human-in-the-loop AI workflow powered by Groq (Llama 3.1 70B). Agents create tickets, run AI analysis grounded in a markdown knowledge base, then approve or reject draft responses and suggested actions.

## Architecture

```
Browser (Vercel)
  React + Vite + Tailwind + React Query
           |
           | HTTPS (VITE_API_URL)
           v
API (Render)
  Express + Winston + better-sqlite3
           |
           +--> SQLite DB (/tmp/support.db on Render)
           +--> /server/kb/*.md knowledge base
           +--> Groq API (llama-3.1-70b-versatile)
```

**Flow:** Agent creates a ticket → optional urgency → Run AI Analysis retrieves KB articles and calls Groq once → UI shows classification, gaps, draft response, suggested action, citations → agent approves/rejects → history timeline records every event. Nothing is sent or executed automatically.

## Tech stack

| Layer | Stack |
|-------|--------|
| Client | React, Vite, Tailwind CSS, React Query, React Router |
| Server | Node.js, Express, better-sqlite3, Winston, Groq SDK |
| AI | Groq — `llama-3.3-70b-versatile` (configurable via `GROQ_MODEL`) |
| Deploy | Vercel (frontend), Render (backend) |

## Local setup

### 1. Prerequisites

- Node.js 18 or newer
- npm
- A free Groq API key (see below)

### 2. Get a free Groq API key

1. Open [https://console.groq.com/](https://console.groq.com/)
2. Sign up or log in
3. Go to **API Keys** and create a key
4. Copy the key (you will paste it into `server/.env`)

### 3. Clone and configure

```bash
cd "Full stack Application"

# Backend env
cp server/.env.example server/.env
# Edit server/.env and set GROQ_API_KEY=...

# Frontend env
cp client/.env.example client/.env
# Default VITE_API_URL=http://localhost:3001 is fine for local use
```

### 4. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 5. Run the full app

From the **project root** (not `server/` or `client/`):

```bash
npm install
npm run dev
```

This starts both:
- API → [http://localhost:3001](http://localhost:3001)
- UI → [http://localhost:5173](http://localhost:5173)

Open **http://localhost:5173** in your browser.

To run only one side:

```bash
npm run dev:server
npm run dev:client
```

### 6. Tests

From the project root:

```bash
npm test
npm run test:server
npm run test:client
npm run test:coverage
```

## Deploy backend on Render (free)

1. Push this repo to GitHub.
2. In [Render](https://render.com/), create a new **Blueprint** or **Web Service** from the repo.
3. If using Blueprint, `render.yaml` configures:
   - Build: `cd server && npm install`
   - Start: `cd server && node index.js`
   - `DB_PATH=/tmp/support.db` (writable on Render)
   - `NODE_ENV=production`
4. Set secret env vars in the Render dashboard:
   - `GROQ_API_KEY` — your Groq key
   - `CORS_ORIGIN` — your Vercel URL, e.g. `https://your-app.vercel.app`
   - `PORT` — usually injected by Render automatically; leave default if present
5. Deploy and confirm `https://<your-service>.onrender.com/health` returns `{ "status": "ok" }`.

**Note:** Free Render web services spin down after inactivity; the first request may be slow. SQLite under `/tmp` is **ephemeral** — data resets when the instance is recycled.

## Deploy frontend on Vercel (free)

1. Import the same GitHub repo in [Vercel](https://vercel.com/).
2. Set **Root Directory** to `client`.
3. Framework preset: Vite (also defined in `client/vercel.json`).
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable:
   - `VITE_API_URL` = `https://<your-render-service>.onrender.com` (no trailing slash)
7. Deploy. Open the Vercel URL and create a test ticket.

## Environment variables

### `server/.env`

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Groq API authentication |
| `PORT` | HTTP port (default `3001`) |
| `DB_PATH` | SQLite file path (local `./data/support.db`, Render `/tmp/support.db`) |
| `NODE_ENV` | `development` / `production` / `test` |
| `CORS_ORIGIN` | Allowed browser origin(s), comma-separated |

### `client/.env`

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL (default `http://localhost:3001`) |

## Known limitations

- **SQLite on Render `/tmp` is ephemeral** — tickets disappear when the free dyno recycles.
- **Free Render cold starts** — first request after idle can take 30–60s.
- **Groq free-tier rate limits** — heavy analyze usage may hit quotas.
- **Single structured AI call** — no multi-step agent loops or tool calling.
- **KB search is keyword-based**, not embeddings/vector search.
- **Draft edits in the UI are local** — approve records the saved AI draft from the database.
- **No authentication** — any visitor with the URL can use the app.
- **better-sqlite3** requires native compilation; Render build must succeed with node-gyp tooling.

## Intentionally excluded (and why)

| Excluded | Why |
|----------|-----|
| User auth / RBAC | Out of scope for the support-assistant demo; keeps deploy free and simple |
| Managed Postgres / Redis | SQLite matches the “single file, no DB server” requirement |
| Auto-send email / chat | Human-in-the-loop requirement: never auto-approve or auto-send |
| Vector embeddings / RAG DB | Markdown + keyword retrieval is enough for the free-tier demo |
| Real-time websockets | REST + React Query is sufficient for agent workflows |
| Multi-tenant orgs | Single shared ticket board keeps schema and UX small |
| CI/CD beyond platform git deploys | Vercel/Render git integration is enough for free hosting |

## Project structure

```
/
├── client/                 # Vercel frontend
│   ├── src/
│   ├── vercel.json
│   └── .env.example
├── server/                 # Render backend
│   ├── index.js            # Production entry (PORT, DB_PATH, SIGTERM)
│   ├── kb/                 # Markdown knowledge base
│   ├── routes/
│   ├── services/
│   ├── tests/
│   └── .env.example
├── render.yaml
├── AGENT_USAGE.md
└── README.md
```
