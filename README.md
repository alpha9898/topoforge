# TopoForge

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-2.10-E92063)
![OpenPyXL](https://img.shields.io/badge/OpenPyXL-3.1-217346)
![Draw.io](https://img.shields.io/badge/Draw.io-mxGraph-F08705?logo=diagramsdotnet&logoColor=white)
![Pytest](https://img.shields.io/badge/Pytest-tested-0A9EDC?logo=pytest&logoColor=white)

TopoForge is a full-stack web app that converts Low-Level Design (LLD) Excel or CSV data into a clean, editable High-Level Design (HLD) network diagram in `.drawio` format.

Designed for network, DevOps, infrastructure, cloud, and data center engineers who need to turn structured LLD data into professional diagrams without manually redrawing every device, port, and cable.

**Live:** `https://frontend-flame-five-srykz60go6.vercel.app`

---

## What It Does

TopoForge takes an uploaded workbook, parses messy infrastructure data, normalizes it into an internal topology model, lets the user correct ambiguous results, and generates an editable Draw.io file.

The generated diagram includes:

- Real network-oriented shapes for servers, switches, firewalls, routers, cloud, VPN, admin endpoint, storage, and PDU/OOB devices.
- Device labels with names, hostnames, and management IPs when available.
- Port-to-port cable labels with color-coded connectors by role.
- Rounded 3px Draw.io connectors with intelligent side anchors.
- Deterministic top-to-bottom HLD layout with density-aware collision avoidance.
- Standard external path: Admin → VPN → Internet → ISP → Firewall.
- OOB management device and management connections.
- Expanded cable reference tables (source, destination, ports, role, color, VLAN, notes).
- Visual legend for cable colors and dashed/solid meanings.
- Switch/OOB port summary tables.
- Notes and issue summaries inside the generated diagram.

---

## Quick Start (Local)

### Requirements

- Python 3.11+
- Node.js 18+
- `make` (Linux/macOS) or run commands manually (Windows)

### 1. Clone and configure

```bash
git clone https://github.com/alpha9898/topoforge.git
cd topoforge
cp .env.example .env
# Optional: add GEMINI_API_KEY to .env to enable AI-assisted parsing
```

### 2. Install all dependencies

```bash
make install
```

### 3. Run both servers

```bash
# Terminal 1 — backend on http://localhost:8001
make dev-backend

# Terminal 2 — frontend on http://localhost:3001
make dev-frontend
```

Open `http://localhost:3001` in your browser.

### Make targets

```bash
make install        # Install backend (pip) + frontend (npm) deps
make dev-backend    # uvicorn --reload on :8001
make dev-frontend   # next dev on :3001
make test           # pytest + vitest
make typecheck      # tsc --noEmit
make build          # next build (production)
```

### Docker Compose

```bash
docker compose up --build
```

Exposes frontend on `:3001` and backend on `:8001`.

---

## User Workflow

1. Open `http://localhost:3001` — landing page with animated SVG topology diagram.
2. Click **Get Started** → Upload step.
3. Drag and drop or click to select an `.xlsx`, `.xls`, `.xlsm`, or `.csv` LLD file.
4. Optionally enable the AI parsing helper (requires `GEMINI_API_KEY`).
5. Review detected devices, connections, issues, and AI suggestions.
6. Apply device corrections: rename, retype, remove duplicates, or add missing devices.
7. Answer clarification questions for unknown types, missing ports, or cable type conflicts.
8. Generate the Draw.io file — browser downloads it automatically.
9. Open in [diagrams.net](https://app.diagrams.net), Draw.io Desktop, or the VS Code Draw.io extension.

---

## Architecture

```text
Frontend - Next.js / React / TypeScript / Tailwind
        |
        v
Backend - FastAPI / Pydantic
        |
        +-- Upload Service
        +-- Excel / CSV Parser
        +-- AI Parser Helper (Gemini, optional)
        +-- Topology Builder
        +-- Topology Completion
        +-- Validation Engine
        +-- Clarification Engine
        +-- Correction Engine
        +-- Layout Engine
        +-- Draw.io XML Generator
        |
        v
Editable .drawio file
```

---

## Project Structure

```text
.
├── backend/
│   ├── main.py
│   ├── models/
│   │   └── topology.py
│   ├── routers/
│   │   ├── clarify.py
│   │   ├── corrections.py
│   │   ├── generate.py
│   │   ├── parse.py
│   │   └── upload.py
│   ├── services/
│   │   ├── ai_parser.py
│   │   ├── clarification_engine.py
│   │   ├── drawio_generator.py
│   │   ├── excel_parser.py
│   │   ├── layout_engine.py
│   │   ├── project_store.py
│   │   ├── topology_builder.py
│   │   ├── topology_completion.py
│   │   ├── topology_corrections.py
│   │   └── validator.py
│   └── tests/
│       ├── test_services.py
│       └── test_api_endpoints.py   ← corrections, clarify, generate, download
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                ← landing page
│   │   ├── clarifications/
│   │   ├── export/
│   │   ├── preview/
│   │   ├── review/
│   │   └── upload/
│   ├── components/
│   │   ├── AiSuggestionsPanel.tsx
│   │   ├── AppShell.tsx            ← session expiry banner
│   │   ├── DeviceCorrectionPanel.tsx
│   │   ├── ErrorBoundary.tsx       ← crash recovery UI
│   │   ├── IssueList.tsx
│   │   ├── LoadingPanel.tsx
│   │   ├── PageHero.tsx
│   │   ├── PrimaryButton.tsx
│   │   ├── StandardPathPanel.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── Toast.tsx               ← success notifications
│   │   └── TopologyTables.tsx      ← searchable device/cable tables
│   ├── lib/
│   │   ├── api.ts
│   │   ├── project-state.ts
│   │   └── types.ts
│   └── test/
│       └── upload-page.test.tsx
│
├── vercel.json                     ← monorepo build config for Vercel
└── README.md
```

---

## Frontend Features

### Wizard pages

| Route | Purpose |
|---|---|
| `/` | Landing page — animated SVG topology, how-it-works, feature cards, count-up stats |
| `/upload` | File picker with drag-and-drop, upload validation, optional AI settings |
| `/review` | Device table, connection table, issues, AI suggestions, correction tools |
| `/clarifications` | Editable questions for ambiguous parsed data |
| `/preview` | Generate diagram and trigger automatic download |
| `/export` | Download links and export state |

### Key components

- **`ErrorBoundary`** — wraps the entire app; catches render exceptions and shows a recovery UI instead of a blank screen.
- **`Toast`** — lightweight auto-dismiss notification shown after corrections are saved.
- **`AppShell`** — wizard chrome with step indicator, navigation, theme toggle, and a session expiry warning banner (appears at 5.5 h, shows expired state at 6 h).
- **`DeviceCorrectionPanel`** — rename, retype, remove, or add devices. Shows an unsaved-changes browser warning if you navigate away without clicking Apply.
- **`TopologyTables`** — searchable/filterable device and connection tables; supports 100+ device topologies without scrolling blind.
- **`AiSuggestionsPanel`** — suggested alias merges, type changes, ignored rows, and duplicate warnings.
- **`StandardPathPanel`** — review and edit Admin, VPN, Internet, ISP-1, ISP-2, and OOB devices.

### Theme

- Stored in `localStorage` as `topoforge-theme`.
- Applied before hydration via `next/script strategy="beforeInteractive"` to eliminate flash.
- Toggle available on every wizard page (top-right).

### Drag-and-drop upload

The upload zone accepts files dropped directly onto it. Unsupported formats show a validation error immediately; no round-trip to the server.

---

## Backend Features

### Upload

Accepts `.xlsx`, `.xls`, `.xlsm`, and `.csv`. Enforces a 20 MB maximum. Stores files in a local temporary folder keyed by a random project ID.

### Excel and CSV Parsing

`excel_parser.py` uses flexible header aliases — no rigid template required.

Supported semantic fields: device name, hostname, device type, port/interface, connected device, connected port, IP/management IP, VLAN/segment, zone, cable/media/link type.

### Topology Builder

Converts raw parsed rows into `Device`, `Port`, `Cable`, and `Topology` Pydantic objects.

Port normalization examples: `Ethernet 1` → `eth1`, `G1/0/1` → `Gi1/0/1`, `mgmt` → `Mgmt`.

Inferred device types: firewall, switch, server, storage, PDU, VPN gateway, ISP router, cloud/internet, admin endpoint, unknown.

### AI Parsing Helper

`ai_parser.py` optionally enriches parsed data using Gemini. It is off by default.

The helper can suggest: alias maps, device type corrections, false-connection warnings, suspicious duplicates, and connection role enrichment.

Privacy: the full workbook bytes are never sent to Gemini. IP addresses are only included if the user explicitly enables "Include IPs in AI". Falls back to local rule-based suggestions if `GEMINI_API_KEY` is absent or Gemini is unavailable.

The API key is sent as the `x-goog-api-key` request header — never as a URL query parameter.

### Topology Completion

`topology_completion.py` adds common enterprise edge structure when missing:

```text
Admin → VPN Gateway → Internet → ISP-1 / ISP-2 → Firewalls
```

Also adds an OOB management node with management links to infrastructure devices.

### Validation

`validator.py` returns structured `Issue` objects.

Severities: `error` (unusable rows/data) and `warning` (ambiguous, missing, duplicate, or suspicious data).

Examples: missing source port, missing target port, unknown device type, unknown cable type, possible port conflict, suspicious topology pattern.

Best-effort generation: warnings are visible to the user but do not block Draw.io generation.

### Clarifications

`clarification_engine.py` turns unresolved issues into user-facing questions: unknown device type, missing source/destination port, unknown cable type, port conflict.

### Corrections

`topology_corrections.py` applies manual user edits: rename device, change device type, change management IP, change zone, remove device, add missing device. Manual corrections take priority over AI suggestions.

### Layout Engine

`layout_engine.py` places devices in deterministic HLD rows:

1. External: Admin, VPN, Internet
2. ISP routers
3. Firewalls
4. Switches
5. Servers and storage
6. Power / PDU
7. Unknown / other

Density-aware spacing: column spacing grows for dense rows; row spacing grows when many links cross between adjacent layers; high-degree devices are placed closer to row center; redundant pairs (`Firewall-1`/`Firewall-2`, `SW1`/`SW2`) stay adjacent.

Port anchor intelligence assigns connector exit/entry points by device type, port role, cable role, peer type, and relative position — keeping WAN links at the top, LAN at the bottom, management on the side, and HA on the opposite side.

Dangling cable references (cables pointing to devices removed via corrections) are silently skipped rather than crashing the generate step.

### Draw.io Generator

`drawio_generator.py` produces mxGraph-compatible XML with:

- Real network-style shapes per device type.
- Rounded orthogonal connectors (`strokeWidth=3`) with `exitX/Y` and `entryX/Y` anchors.
- Cable color legend.
- Expanded cable reference table (source, destination, ports, role, color, VLAN, notes).
- Switch/OOB port summary.
- Notes and warning summary.

Cable color conventions:

| Role | Color | Style |
|---|---|---|
| WAN / Internet | Gray | Solid |
| LAN / Internal | Blue | Solid |
| Management / OOB | Green | Dashed |
| Firewall HA | Purple | Dashed |
| Storage | Orange | Solid |
| Power / PDU | Red | Dashed |
| Unknown | Black | Solid |

---

## API Reference

### Health

```http
GET /api/health
```

```json
{ "status": "ok" }
```

### Upload File

```http
POST /api/upload
```

```json
{ "project_id": "abc123", "status": "uploaded" }
```

### Parse Project

```http
POST /api/projects/{project_id}/parse
```

Optional body:

```json
{ "use_ai_helper": true, "include_ips_in_ai": false }
```

### Apply Corrections

```http
POST /api/projects/{project_id}/corrections
```

```json
{
  "device_updates": [{ "id": "dev-1", "name": "fw-01", "type": "firewall" }],
  "removed_device_ids": ["dev-2"],
  "added_devices": [{ "name": "new-sw", "type": "switch" }]
}
```

### Get Clarifications

```http
GET /api/projects/{project_id}/clarifications
```

### Submit Clarifications

```http
POST /api/projects/{project_id}/clarifications
```

```json
{ "answers": [{ "question_id": "q1", "answer": "eth1" }] }
```

### Generate Draw.io

```http
POST /api/projects/{project_id}/generate
```

```json
{ "status": "generated", "drawio_url": "/api/projects/{project_id}/download" }
```

### Download Draw.io

```http
GET /api/projects/{project_id}/download
```

Returns an attachment response containing the generated `.drawio` file.

---

## Data Model

Core Pydantic v2 models live in `backend/models/topology.py`.

### Device

```json
{
  "id": "gui1fwall01",
  "name": "gui1fwall01",
  "hostname": "gui1fwall01",
  "type": "firewall",
  "mgmtIp": "10.123.11.7",
  "zone": "Site-1-links",
  "ports": [],
  "aliases": []
}
```

### Cable

```json
{
  "id": "cable-001",
  "sourceDeviceId": "gui1fwall01",
  "sourcePort": "eth1",
  "targetDeviceId": "gui1swtch01",
  "targetPort": "Gi1/0/1",
  "cableType": "ethernet",
  "connectionRole": "lan",
  "label": "gui1fwall01 eth1 -> gui1swtch01 Gi1/0/1"
}
```

### Issue

```json
{
  "id": "issue-001",
  "severity": "warning",
  "code": "missing_source_port",
  "message": "Connection cable-001 is missing the source port.",
  "entity_id": "cable-001"
}
```

---

## Environment Variables

### Frontend

```text
NEXT_PUBLIC_API_BASE=http://localhost:8001
```

Set automatically to the production backend URL via `vercel.json` on Vercel deployments.

### Backend

```text
GEMINI_API_KEY=             # Optional — enables AI-assisted parsing
PROJECT_TTL_HOURS=6         # How long projects live in memory
PROJECT_CLEANUP_INTERVAL_MINUTES=30
CORS_ALLOW_ORIGINS=         # Comma-separated extra allowed origins (production)
```

Copy `.env.example` when bootstrapping local development.

---

## Testing

```bash
# All tests
make test

# Backend only
cd backend && pytest

# Frontend only
cd frontend && npm test

# Frontend type check + lint
cd frontend && npm run typecheck && npm run lint
```

Test coverage:

- **`backend/tests/test_services.py`** — unit tests for parser, topology builder, validator, layout engine, and Draw.io generator.
- **`backend/tests/test_api_endpoints.py`** — 16 integration tests via FastAPI `TestClient` covering corrections, clarifications, generate, download, and dangling-cable crash regression.
- **`frontend/test/upload-page.test.tsx`** — file validation and upload zone rendering.

GitHub Actions runs the full suite on every push and pull request.

---

## CI/CD

Pull requests run: `pytest` (backend) + `npm ci`, lint, Vitest, typecheck, and `next build` (frontend).

Pushes to `main` run the same validation then auto-deploy to Vercel via GitHub Actions.

Required GitHub secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID            # frontend Vercel project
VERCEL_BACKEND_PROJECT_ID    # backend Vercel project
```

### Vercel configuration

`vercel.json` at the repo root configures the frontend project for the monorepo layout:

```json
{
  "installCommand": "cd frontend && npm install",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_BASE": "https://topoforge-backend-vercel.vercel.app"
  }
}
```

Backend project uses Vercel's FastAPI/Python preset with root directory `backend/`.

Production endpoints:

- **Frontend:** `https://frontend-flame-five-srykz60go6.vercel.app`
- **Backend:** `https://topoforge-backend-vercel.vercel.app`

> **Note:** This MVP uses in-memory project state and `/tmp` file storage on Vercel. Suitable for demos and quick testing; production workloads should use persistent storage (Vercel Blob + Redis/PostgreSQL).

---

## Security

Current safeguards:

- File extension and MIME validation.
- 20 MB file size limit.
- Upload filename sanitization.
- Random project IDs (no enumerable resource paths).
- In-memory project state with 6-hour TTL and background cleanup.
- No workbook code execution.
- Full workbook bytes never sent to AI services.
- Optional IP redaction before AI helper calls.
- Gemini API key sent as `x-goog-api-key` request header (not exposed in URLs or logs).
- CORS locked to explicit allowed origins; no wildcard Vercel regex.

Production hardening still needed:

- Authentication and authorization.
- Persistent database.
- Virus/malware scanning for uploads.
- Signed download URLs.
- Object storage with lifecycle policies.
- Rate limiting and audit logging.

---

## Known Limitations

- Project state is in-memory and lost on backend restart.
- Generated files are cleaned up after the TTL — download before the session expires.
- AI suggestions are optional and should be reviewed before applying.
- Complex multi-site or multi-VRF topologies may need additional rules.
- No Draw.io editor embedded in-app.
- No user accounts or collaboration.

---

## Troubleshooting

### "Network error — check that the backend is running"

Verify the backend health endpoint:

```bash
curl http://localhost:8001/api/health
```

If running locally, ensure `NEXT_PUBLIC_API_BASE=http://localhost:8001` is set before starting the frontend. On Vercel, `vercel.json` sets this automatically.

### Generate opens XML in the browser

Use the `/download` endpoint (attachment response). Regenerate from the preview page after a backend restart.

### Theme or hydration warnings in development

Refresh the tab and restart the frontend dev server. The `beforeInteractive` script applies the saved theme before React hydrates.

### AI helper produces no Gemini suggestions

Set `GEMINI_API_KEY` in `.env`, restart the backend, and run AI helper again. Without a key, the app silently falls back to local rule-based suggestions.

### Session expiry warning banner

Projects expire after 6 hours. The banner appears at 5.5 hours and switches to an "expired" state at 6 hours. Download your `.drawio` file before the session ends.

---

## Roadmap

Potential next phases:

- PostgreSQL project persistence.
- User accounts and teams.
- Cloud object storage with lifecycle policies.
- Background generation jobs.
- VLAN and VRF-specific diagrams.
- Rack elevation diagrams.
- Cloud provider icon packs.
- SVG and PNG exports.
- Version diff between LLD files.
- Advanced port-channel and LAG handling.
- More layout templates.

---

## License

All rights reserved. This repository is private proprietary software; see `LICENSE`.
