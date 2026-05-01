# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TopoForge** — a wizard-style SaaS app that converts Excel/CSV network topology spreadsheets into Draw.io XML diagrams. No auth, no database (MVP).

## Commands

### Running the app
```bash
make install          # Install all deps (backend + frontend)
make dev-backend      # FastAPI on http://localhost:8001
make dev-frontend     # Next.js on http://localhost:3001
```

### Testing
```bash
make test             # Run pytest + frontend vitest
# Backend only:
cd backend && pytest
# Frontend only:
cd frontend && npm test
```

### Frontend checks
```bash
cd frontend
npm run lint          # ESLint (--max-warnings=0, zero tolerance)
npm run typecheck     # tsc --noEmit
npm run build         # Production build
```

## Architecture

### Request flow
```
/upload → /parse → /review (corrections/clarifications) → /generate → /export
```

Each step calls the FastAPI backend. The backend stores state **in-memory** (no DB) keyed by a random project ID with a 6-hour TTL (`PROJECT_TTL_HOURS`). The frontend passes the project ID in every request.

### Backend (`backend/`)
- **`main.py`** — FastAPI app, CORS, lifespan startup (TTL cleanup loop), mounts routers
- **`routers/`** — Thin HTTP layer: `upload`, `parse`, `corrections`, `clarify`, `generate`
- **`services/`** — All business logic:
  - `excel_parser.py` → flexible header aliases, row extraction
  - `topology_builder.py` → builds Device/Cable graph from parsed rows
  - `validator.py` → produces structured `Issue` objects (error/warning)
  - `clarification_engine.py` → identifies unknowns needing user input
  - `topology_completion.py` → adds enterprise edge devices before layout
  - `layout_engine.py` → deterministic HLD grid placement
  - `drawio_generator.py` → renders mxGraph XML from the placed topology
  - `ai_parser.py` → optional Gemini enrichment (redacts IPs before sending)
  - `project_store.py` → in-memory dict with TTL cleanup
- **`models/topology.py`** — All Pydantic v2 models: `Device`, `Cable`, `Port`, `Issue`, `Topology`

### Frontend (`frontend/`)
- **Next.js App Router** with pages at `app/{upload,review,clarifications,preview,export}/page.tsx`
- **`lib/api.ts`** — typed fetch wrappers for all backend endpoints
- **`lib/types.ts`** — TypeScript mirrors of backend Pydantic models
- **`lib/project-state.ts`** — client-side project ID persistence (localStorage)
- **`components/AppShell.tsx`** — wizard chrome (step indicator, nav)
- Theme: Tailwind CSS + light/dark via `ThemeProvider.tsx` (no-flash script in `layout.tsx`)

### Key constants
| Concept | Value |
|---|---|
| Backend port | 8001 |
| Frontend port | 3001 |
| CORS origins | localhost:3000, 3001 |
| Project TTL | 6 hours |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8001` |
| `GEMINI_API_KEY` | optional — enables AI parsing |

### Device layout tiers (top → bottom in generated diagram)
External → ISP Routers → Firewalls → Switches → Servers/Storage → Power/PDU → Unknown

### Cable color conventions
`WAN`=gray, `LAN`=blue, `Management/OOB`=green-dashed, `Firewall HA`=purple-dashed, `Storage`=orange, `Power`=red-dashed, `Unknown`=black

## Environment variables
Copy `.env.example` to `.env` in the repo root. The Makefile loads it automatically. Frontend vars must be prefixed `NEXT_PUBLIC_`.

## CI
`.github/workflows/` runs on push/PR: pytest (backend), then ESLint + vitest + tsc + build (frontend).
