# Agent usage notes

This document records how AI tooling was used while building the Customer Support Assistant.

## Tools used

- **Cursor** — primary IDE and agent workspace for scaffolding, implementation, tests, and deployment prep
- **Composer / Cursor Agent (Auto)** — multi-file code generation and iterative fixes across `client/` and `server/`
- **Groq API** — runtime model used by the app (`llama-3.1-70b-versatile`), not used to author the repository code

## Which parts were AI-generated

Nearly all application code in this repository was AI-assisted, including:

- Project scaffold (`client` Vite/React/Tailwind, `server` Express)
- SQLite schema, ticket service, and REST routes
- Markdown knowledge base samples and `kbLoader`
- Groq `aiOrchestrator` and human-in-the-loop AI routes
- React pages (ticket list, create form, detail workspace)
- Winston structured logging + HTTP request middleware
- Vitest + Supertest (server) and Vitest + React Testing Library (client) suites
- `render.yaml`, `vercel.json`, env examples, README, and this file

Human direction set architecture, requirements, and acceptance criteria at each step.

## Which prompts were used (summary)

Prompts were issued in phases, roughly:

1. **Scaffold only** — create `/client` and `/server` with configs so both start without app logic
2. **Database layer** — better-sqlite3 schema, ticket service, ticket REST routes, Winston logging
3. **Knowledge base** — sample markdown articles + recursive loader/search with no caching
4. **AI workflow** — Groq single JSON completion, analyze/approve/reject endpoints, no auto-approve
5. **React frontend** — routes, forms, ticket workspace sections, React Query states
6. **Logging + tests** — structured Winston events, Vitest suites, npm test scripts
7. **Deployment prep** — Render + Vercel configs, env examples, README, agent usage doc

Each prompt constrained scope (for example: “do not write application logic yet” during scaffolding).

## AI mistakes that were caught and corrected

- **Client `npm install` / esbuild `EBUSY`** on Windows — cleaned `node_modules` and reinstalled
- **Port 3001 `EADDRINUSE`** after restarts — old Node process left listening; process was stopped and server relaunched
- **Auto status change ambiguity** — analyze originally avoided changing status; product rule later required `open` → `in-review` on analysis, which was re-added
- **Optional urgency** — backend initially required urgency; updated when the form made urgency optional
- **KB articles missing full `content` in `retrieved_articles`** — fixed so the Knowledge Sources panel can expand full text
- **Client test import paths** — tests under `src/tests/` incorrectly used `../../`; corrected to `../`
- **RTL cleanup** — duplicate DOM nodes across tests fixed with `afterEach(cleanup)`
- **Accidental `file:..` dependency** in `server/package.json` from root install — removed during deployment prep
- **Entry path for Render** — app lived in `server/src/index.js`; added `server/index.js` to match `node index.js` start command and graceful shutdown

## How generated code was verified

- Manual API smoke tests with PowerShell `Invoke-RestMethod` (create/list/get/status/history)
- `kbLoader` exercised via Node one-liners (load all articles + ranked search)
- `npm run build` for the Vite client
- `npm run test:server` — 7 Vitest + Supertest tests (including mocked Groq analyze)
- `npm run test:client` — 9 RTL/Vitest tests (form, detail states, status badge colors)
- `npm test` from repo root runs both suites
- Import/syntax checks after module refactors (`createApp`, logger move, API base URL config)

## Review recommendations before production use

- Add authentication before exposing a public URL
- Replace ephemeral `/tmp` SQLite with durable storage if ticket history must persist
- Confirm Groq model availability on your account (IDs can deprecate over time)
- Set `CORS_ORIGIN` to the exact Vercel origin after frontend deploy
