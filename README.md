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

The application is designed for network, DevOps, infrastructure, cloud, and data center engineers who need to turn structured LLD data into professional diagrams without manually redrawing every device, port, and cable.

Open `http://localhost:3001` to reach the landing page. Click **Get Started** or **Upload your spreadsheet** to enter the five-step wizard.

## What It Does

TopoForge takes an uploaded workbook, parses messy infrastructure data, normalizes it into an internal topology model, lets the user correct ambiguous results, and generates an editable Draw.io file.

The generated diagram includes:

- Real network-oriented shapes for servers, switches, firewalls, routers, cloud, VPN, admin endpoint, storage, and PDU/OOB style devices.
- Device labels with names, hostnames, and management IPs when available.
- Port-to-port cable labels.
- Rounded 3px Draw.io connectors with intelligent side anchors.
- Device-aware port placement for WAN, LAN, management/OOB, HA, server data, and power links.
- Deterministic top-to-bottom HLD layout with density-aware collision avoidance.
- Standard external path generation: Admin -> VPN -> Internet -> ISP -> Firewall.
- OOB management device and management connections.
- Expanded cable reference tables with source, destination, ports, role, color, VLAN, and notes.
- A visual legend for cable colors and dashed/solid meanings.
- Switch/OOB port summary tables.
- Notes and issue summaries inside the generated diagram.

## MVP Status

This project is an MVP. It intentionally uses:

- In-memory project state.
- Local temporary upload/output folders.
- No authentication.
- No database.
- No cloud storage.
- Best-effort generation even when warnings exist.

The current goal is deterministic, technically inspectable `.drawio` output rather than a full Draw.io editor clone.

## Architecture

```text
Frontend - Next.js / React / TypeScript / Tailwind
        |
        v
Backend - FastAPI / Pydantic
        |
        +-- Upload Service
        +-- Excel Parser
        +-- AI Parser Helper
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
│   ├── storage/
│   │   ├── outputs/
│   │   └── uploads/
│   └── tests/
│       └── test_services.py
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx              ← landing page
│   │   ├── clarifications/
│   │   ├── export/
│   │   ├── preview/
│   │   ├── review/
│   │   └── upload/
│   ├── components/
│   │   ├── AiSuggestionsPanel.tsx
│   │   ├── AppShell.tsx
│   │   ├── DeviceCorrectionPanel.tsx
│   │   ├── IssueList.tsx
│   │   ├── LoadingPanel.tsx
│   │   ├── PageHero.tsx
│   │   ├── PrimaryButton.tsx
│   │   ├── StandardPathPanel.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── TopologyTables.tsx
│   └── lib/
│       ├── api.ts
│       ├── project-state.ts
│       └── types.ts
│
└── README.md
```

## User Workflow

1. Open `http://localhost:3001` — the landing page introduces the tool and links to the wizard.
2. Click **Get Started** to reach the upload step.
3. Upload an `.xlsx`, `.xls`, or `.csv` LLD file.
4. Optionally enable the AI parsing helper.
5. Review detected devices, connections, issues, and AI suggestions.
6. Apply device corrections, remove duplicates, rename standard path devices, or add missing devices.
7. Answer clarification questions for unknown types, missing ports, cable types, and conflicts.
8. Generate the Draw.io file.
9. The browser automatically downloads the `.drawio` output.
10. Open the file in diagrams.net, Draw.io Desktop, or a Draw.io-compatible VS Code extension.

## Frontend Features

The frontend consists of a marketing landing page at `/` followed by a five-step wizard. The landing page uses staggered scroll-triggered animations, an animated SVG network topology diagram, and animated count-up statistics — all built with the same Tailwind design tokens as the wizard so the transition feels seamless.

The wizard uses centered panels, translucent surfaces, responsive step navigation with directional slide transitions, and a persistent light/dark theme toggle.

Theme behavior:

- Theme preference is stored in `localStorage` as `topoforge-theme`.
- `next/script` applies the saved theme before hydration to reduce visible theme flash.
- `ThemeProvider` keeps the first render deterministic and then syncs the stored theme after mount.
- `ThemeToggle` is available in the top-right app shell on every wizard page.

Pages:

- `/` - landing page with animated SVG topology diagram, how-it-works steps, feature cards, and count-up stats.
- `/upload` - file picker, upload validation, optional AI helper settings.
- `/review` - device table, connection table, issues, AI suggestions, manual correction tools.
- `/clarifications` - editable question list for ambiguous parsed data.
- `/preview` - generate diagram and trigger automatic download.
- `/export` - download links and export state.

Important UI components:

- `AiSuggestionsPanel` shows suggested alias merges, type changes, ignored rows, and duplicate warnings.
- `AppShell` provides the centered command-center layout, wizard progress, and theme toggle.
- `DeviceCorrectionPanel` lets users rename, retype, remove, or add devices.
- `LoadingPanel` provides consistent loading and empty states.
- `PageHero` provides the centered futuristic page header used across the wizard.
- `StandardPathPanel` lets users review and edit Admin, VPN, Internet, ISP-1, ISP-2, and OOB devices.
- `ThemeProvider` and `ThemeToggle` manage the persistent light/dark experience.
- `TopologyTables` displays the normalized devices and cables before generation.

## Backend Features

### Upload

The upload router accepts infrastructure files and stores them in local temporary storage.

Supported MVP input types:

- `.xlsx`
- `.xls`
- `.csv`

The upload endpoint enforces a 20 MB maximum file size.

### Excel And CSV Parsing

`excel_parser.py` reads workbook sheets and uses flexible header aliases instead of requiring one exact template.

Supported semantic fields include:

- Device name
- Hostname
- Device type
- Port/interface
- Connected device
- Connected port
- IP / management IP
- VLAN / segment
- Zone
- Cable / media / link type

The parser is intentionally permissive. It extracts candidate rows, then later services decide what is valid, suspicious, or ambiguous.

### Topology Builder

`topology_builder.py` converts raw parsed rows into normalized objects:

- `Device`
- `Port`
- `Cable`
- `Topology`

It normalizes ports such as:

- `Ethernet 1` -> `eth1`
- `G1/0/1` -> `Gi1/0/1`
- `mgmt` -> `Mgmt`

It infers common device types from names and behavior:

- Firewall
- Switch
- Server
- Storage
- PDU
- VPN gateway
- ISP router
- Cloud / Internet
- Admin endpoint
- Unknown

### AI Parsing Helper

`ai_parser.py` optionally assists parsing. It does not replace the deterministic parser.

The helper can suggest:

- Alias maps such as `SW1 -> gui1swtch01`.
- Alias maps such as `Firewall-1 -> gui1fwall01`.
- Device type suggestions.
- Rows that look like false connections.
- Suspicious duplicate devices.
- Connection enrichment such as roles, clearer labels, and management/OOB interpretation.

Privacy behavior:

- AI helper is off by default.
- The full workbook bytes are not sent to Gemini.
- IP addresses are only included if the user explicitly enables "Include IPs in AI".
- If `GEMINI_API_KEY` is missing or Gemini fails, TopoForge falls back to local rule-based suggestions.

Environment variable:

```powershell
$env:GEMINI_API_KEY="your-gemini-api-key"
```

### Topology Completion

`topology_completion.py` adds common enterprise edge structure when missing:

```text
Admin -> VPN Gateway -> Internet -> ISP-1 / ISP-2 -> Firewalls
```

It also adds an OOB management node and creates management links to infrastructure devices where appropriate.

### Validation

`validator.py` returns structured issues.

Issue severities:

- `error` - rows or data that are unusable.
- `warning` - ambiguous, missing, duplicate-looking, or suspicious topology data.

Examples:

- Missing source port.
- Missing target port.
- Unknown device type.
- Unknown cable type.
- Possible port conflict.
- Suspicious topology pattern.

The MVP uses best-effort generation. Warnings are visible to the user but do not block Draw.io generation.

### Clarifications

`clarification_engine.py` turns unresolved issues into user-facing questions.

Example clarification types:

- Unknown device type.
- Missing source port.
- Missing destination port.
- Unknown cable type.
- Port conflict.

### Corrections

`topology_corrections.py` applies manual user edits after parsing.

Supported correction actions:

- Rename device.
- Change device type.
- Change management IP.
- Change zone.
- Remove device.
- Add missing device.

Manual corrections take priority over AI suggestions.

### Layout

`layout_engine.py` places devices in deterministic HLD rows:

1. External: Admin, VPN, Internet.
2. ISP routers.
3. Firewalls.
4. Switches.
5. Servers and storage.
6. Power / PDU.
7. Unknown / other.

The layout uses density-aware spacing so devices are farther apart when cable pressure is high. TopoForge calculates device degree, inter-row link density, and same-row fan-out before assigning coordinates.

Collision avoidance behavior:

- Column spacing grows for dense rows with many device connections.
- Row spacing grows when many links cross between adjacent HLD layers.
- High-degree devices are placed closer to the center of their row.
- Redundant pairs such as `Firewall-1` / `Firewall-2` and `SW1` / `SW2` stay adjacent where possible.
- Parallel cables between the same devices and busy rows receive wider waypoint offsets to reduce overlap.

Port Anchor Intelligence chooses connector exit and entry points based on device type, port role, cable role, peer type, and relative position. This keeps the generated HLD closer to how network diagrams are normally read:

- Firewall WAN links leave from the top, LAN links from the bottom, management from the left, and HA/sync links from the right.
- Switch uplinks, firewall, WAN, and core links use the top side; server, storage, and access links use the bottom side; management/OOB links use a side anchor.
- Server and storage data NICs use the top side, iDRAC/IPMI/Mgmt links use the left side, and power links use the bottom side.
- PDU and OOB fan-out links attach upward into the topology.
- Multiple cables on the same side are spread across stable side slots to reduce overlapping connectors.

### Draw.io Generator

`drawio_generator.py` creates mxGraph-compatible XML.

The output includes:

- Device cells.
- Real network-style shapes.
- Rounded orthogonal cable connectors with `strokeWidth=3` for clearer visibility in Draw.io.
- Port labels.
- `exitX`, `exitY`, `entryX`, and `entryY` connector anchors.
- Cable colors by role.
- Expanded cable reference table with source device, source port, destination device, destination port, role, source-device color, VLAN, and notes.
- Cable color legend.
- Switch/OOB port summary.
- Notes and warning summary.

VLAN handling is best-effort for the MVP. The generator first uses the cable VLAN field, then falls back to source or destination port VLAN, then to VLAN-like connection role values such as `603` or `VLAN 603`. If no VLAN can be inferred, the table shows `-`.

Cable colors:

| Role | Color | Style |
| --- | --- | --- |
| WAN / Internet | Gray | Solid |
| LAN / Internal | Blue | Solid |
| Management / OOB | Green | Dashed |
| Firewall HA | Purple | Dashed |
| Storage | Orange | Solid |
| Power / PDU | Red | Dashed |
| Unknown | Black | Solid |

## API Reference

### Health

```http
GET /api/health
```

Response:

```json
{
  "status": "ok"
}
```

### Upload File

```http
POST /api/upload
```

Response:

```json
{
  "project_id": "abc123",
  "status": "uploaded"
}
```

### Parse Project

```http
POST /api/projects/{project_id}/parse
```

Optional request body:

```json
{
  "use_ai_helper": true,
  "include_ips_in_ai": false
}
```

Response shape:

```json
{
  "devices": [],
  "cables": [],
  "issues": [],
  "aiSuggestions": {}
}
```

### Apply Corrections

```http
POST /api/projects/{project_id}/corrections
```

Request:

```json
{
  "device_updates": [],
  "removed_device_ids": [],
  "added_devices": []
}
```

### Get Clarifications

```http
GET /api/projects/{project_id}/clarifications
```

Response:

```json
{
  "questions": []
}
```

### Submit Clarifications

```http
POST /api/projects/{project_id}/clarifications
```

Request:

```json
{
  "answers": [
    {
      "question_id": "q1",
      "answer": "eth1"
    }
  ]
}
```

### Generate Draw.io

```http
POST /api/projects/{project_id}/generate
```

Response:

```json
{
  "status": "generated",
  "drawio_url": "/api/projects/{project_id}/download"
}
```

### Download Draw.io

```http
GET /api/projects/{project_id}/download
```

Returns an attachment response containing the generated `.drawio` file.

## Data Model

Core Pydantic models live in `backend/models/topology.py`.

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

## Local Development

### Requirements

- Python 3.13 or compatible Python 3.x runtime.
- Node.js compatible with the installed Next.js version.
- npm.

### Install Backend Dependencies

PowerShell:

```powershell
python -m pip install -r backend\requirements.txt
```

Alternative workspace-local install:

```powershell
python -m pip install -r backend\requirements.txt --target backend\.vendor
```

Bash:

```bash
python -m pip install -r backend/requirements.txt
```

### Install Frontend Dependencies

PowerShell:

```powershell
Push-Location frontend
npm.cmd install
Pop-Location
```

Bash:

```bash
cd frontend
npm install
cd ..
```

### Run Backend

PowerShell:

```powershell
Push-Location backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
Pop-Location
```

Bash:

```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Backend URL:

```text
http://localhost:8001
```

### Run Frontend

PowerShell:

```powershell
Push-Location frontend
$env:NEXT_PUBLIC_API_BASE="http://localhost:8001"
npm.cmd run dev -- -p 3001
Pop-Location
```

Bash:

```bash
cd frontend
NEXT_PUBLIC_API_BASE=http://localhost:8001 npm run dev -- -p 3001
```

Frontend URL:

```text
http://localhost:3001
```

### Docker Compose

```bash
docker compose up --build
```

Docker exposes:

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:8001`

### Make Targets

```bash
make install
make dev-backend
make dev-frontend
make test
make typecheck
make build
```

## Environment Variables

### Frontend

```text
NEXT_PUBLIC_API_BASE=http://localhost:8001
```

### Backend

```text
GEMINI_API_KEY=optional Gemini API key for AI-assisted parsing
PROJECT_TTL_HOURS=6
PROJECT_CLEANUP_INTERVAL_MINUTES=30
```

Copy `.env.example` when bootstrapping local development.

## Testing

Run backend tests:

```powershell
python -m pytest backend\tests -c backend\pytest.ini
```

Run frontend type checks:

```powershell
Push-Location frontend
npm.cmd run typecheck
Pop-Location
```

Run frontend tests and lint:

```powershell
Push-Location frontend
npm.cmd run test
npm.cmd run lint
Pop-Location
```

Optional frontend build:

```powershell
Push-Location frontend
npm.cmd run build
Pop-Location
```

GitHub Actions runs backend tests, frontend lint, tests, typecheck, and production build on pull request and on pushes to `main`.

## CI/CD

The repository uses GitHub Actions for validation and production deployment.

Pull requests run validation only:

- Backend: install Python dependencies and run `pytest`.
- Frontend: `npm ci`, lint, Vitest, TypeScript typecheck, and Next.js production build.

Pushes to `main` and manual `workflow_dispatch` runs execute the same validation first. If validation passes, the workflow:

- Deploys the frontend to Vercel from the `frontend/` project root.
- Triggers the backend deployment on Render with the pushed commit SHA.

Required GitHub repository secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_API_BASE
RENDER_DEPLOY_HOOK_URL
```

Vercel setup:

- Project root: `frontend`
- Framework preset: Next.js
- Production environment variable: `NEXT_PUBLIC_API_BASE` should point to the Render backend URL.

Render setup:

- Service type: Web Service
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Runtime environment variables: configure `GEMINI_API_KEY`, `PROJECT_TTL_HOURS`, and `PROJECT_CLEANUP_INTERVAL_MINUTES` in Render.

Deployment jobs are skipped for pull requests. Missing deployment secrets affect only the deploy jobs on `main`, not pull request validation.

## Security Notes

This MVP includes important local safeguards:

- File extension validation.
- File size limit.
- Upload filename sanitization.
- Random project IDs.
- Local temporary upload/output folders with 6-hour TTL cleanup by default.
- No workbook execution.
- No full workbook upload to AI services.
- Optional IP redaction for AI helper.

The `/downloads` static mount remains enabled for local MVP convenience only. The primary download path is `/api/projects/{project_id}/download`; production deployments should replace both with authenticated or signed downloads.

Production hardening still needed:

- Authentication.
- Authorization.
- Persistent database.
- Virus/malware scanning for uploads.
- Signed download URLs.
- Object storage with lifecycle policies.
- Audit logging.
- Rate limiting.

## Known Limitations

- Project state is stored in memory and disappears when the backend restarts.
- Project files are automatically cleaned up after the configured TTL, so generated local files should be downloaded before expiry.
- Generated diagrams are deterministic but not a replacement for final engineering review.
- AI suggestions are optional and should be reviewed before applying.
- Complex multi-site or multi-VRF topologies may need more rules.
- The MVP does not include a Draw.io editor clone.
- The MVP does not include user accounts or collaboration.

## Troubleshooting

### Upload fails with "Failed to fetch"

Check that the backend is running and that the frontend has the correct API base:

```powershell
Invoke-RestMethod http://localhost:8001/api/health
```

Then restart the frontend with:

```powershell
$env:NEXT_PUBLIC_API_BASE="http://localhost:8001"
npm.cmd run dev -- -p 3001
```

### Generate opens XML in the browser

The app uses the `/download` endpoint with an attachment response. Regenerate the diagram from the preview page after backend restart.

### Theme or hydration warnings appear in development

The frontend initializes the saved theme with Next.js `Script` using `strategy="beforeInteractive"` and then syncs state in `ThemeProvider` after mount. If an old dev overlay remains visible after pulling changes, refresh the browser tab and restart the frontend dev server.

### AI helper does not produce Gemini suggestions

Set `GEMINI_API_KEY`, restart the backend, and run AI helper again. Without a key, the app falls back to local rule-based suggestions.

### Tests cannot find temporary files

Temporary test files are ignored by Git and removed after each test. Re-run:

```powershell
python -m pytest backend\tests -c backend\pytest.ini
```

## Roadmap

Potential next phases:

- PostgreSQL project persistence.
- User accounts and teams.
- Cloud object storage.
- Background generation jobs.
- VLAN and VRF-specific diagrams.
- Rack elevation diagrams.
- Cloud provider icon packs.
- SVG and PNG exports.
- Version diff between LLD files.
- More advanced port-channel and LAG handling.
- More layout templates.

## License

All rights reserved. This repository is private proprietary software; see `LICENSE`.
