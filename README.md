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

TopoForge is a full-stack MVP that converts Low-Level Design (LLD) Excel or CSV data into a clean, editable High-Level Design (HLD) network diagram in `.drawio` format.

The application is designed for network, DevOps, infrastructure, cloud, and data center engineers who need to turn structured LLD data into professional diagrams without manually redrawing every device, port, and cable.

## What It Does

TopoForge takes an uploaded workbook, parses messy infrastructure data, normalizes it into an internal topology model, lets the user correct ambiguous results, and generates an editable Draw.io file.

The generated diagram includes:

- Real network-oriented shapes for servers, switches, firewalls, routers, cloud, VPN, admin endpoint, storage, and PDU/OOB style devices.
- Device labels with names, hostnames, and management IPs when available.
- Port-to-port cable labels.
- Rounded Draw.io connectors with side anchors.
- Deterministic top-to-bottom HLD layout.
- Standard external path generation: Admin -> VPN -> Internet -> ISP -> Firewall.
- OOB management device and management connections.
- Cable reference tables in the diagram.
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
│   │   ├── PrimaryButton.tsx
│   │   ├── StandardPathPanel.tsx
│   │   └── TopologyTables.tsx
│   └── lib/
│       ├── api.ts
│       ├── project-state.ts
│       └── types.ts
│
└── README.md
```

## User Workflow

1. Open the upload page.
2. Upload an `.xlsx`, `.xls`, or `.csv` LLD file.
3. Optionally enable the AI parsing helper.
4. Review detected devices, connections, issues, and AI suggestions.
5. Apply device corrections, remove duplicates, rename standard path devices, or add missing devices.
6. Answer clarification questions for unknown types, missing ports, cable types, and conflicts.
7. Generate the Draw.io file.
8. The browser automatically downloads the `.drawio` output.
9. Open the file in diagrams.net, Draw.io Desktop, or a Draw.io-compatible VS Code extension.

## Frontend Features

The frontend is a practical wizard-style app rather than a marketing landing page.

Pages:

- `/upload` - file picker, upload validation, optional AI helper settings.
- `/review` - device table, connection table, issues, AI suggestions, manual correction tools.
- `/clarifications` - editable question list for ambiguous parsed data.
- `/preview` - generate diagram and trigger automatic download.
- `/export` - download links and export state.

Important UI components:

- `AiSuggestionsPanel` shows suggested alias merges, type changes, ignored rows, and duplicate warnings.
- `DeviceCorrectionPanel` lets users rename, retype, remove, or add devices.
- `StandardPathPanel` lets users review and edit Admin, VPN, Internet, ISP-1, ISP-2, and OOB devices.
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

The layout uses widened row and column spacing so devices are farther apart and cable paths are easier to inspect.

### Draw.io Generator

`drawio_generator.py` creates mxGraph-compatible XML.

The output includes:

- Device cells.
- Real network-style shapes.
- Rounded orthogonal cable connectors.
- Port labels.
- `exitX`, `exitY`, `entryX`, and `entryY` connector anchors.
- Cable colors by role.
- Cable reference table.
- Cable color legend.
- Switch/OOB port summary.
- Notes and warning summary.

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

```powershell
python -m pip install -r backend\requirements.txt
```

Alternative workspace-local install:

```powershell
python -m pip install -r backend\requirements.txt --target backend\.vendor
```

### Install Frontend Dependencies

```powershell
Push-Location frontend
npm.cmd install
Pop-Location
```

### Run Backend

```powershell
Push-Location backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
Pop-Location
```

Backend URL:

```text
http://localhost:8001
```

### Run Frontend

```powershell
Push-Location frontend
$env:NEXT_PUBLIC_API_BASE="http://localhost:8001"
npm.cmd run dev -- -p 3001
Pop-Location
```

Frontend URL:

```text
http://localhost:3001
```

## Environment Variables

### Frontend

```text
NEXT_PUBLIC_API_BASE=http://localhost:8001
```

### Backend

```text
GEMINI_API_KEY=optional Gemini API key for AI-assisted parsing
```

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

Optional frontend build:

```powershell
Push-Location frontend
npm.cmd run build
Pop-Location
```

## Security Notes

This MVP includes important local safeguards:

- File extension validation.
- File size limit.
- Random project IDs.
- Local temporary upload/output folders.
- No workbook execution.
- No full workbook upload to AI services.
- Optional IP redaction for AI helper.

Production hardening still needed:

- Authentication.
- Authorization.
- Persistent database.
- Expiring project cleanup.
- Virus/malware scanning for uploads.
- Signed download URLs.
- Object storage with lifecycle policies.
- Audit logging.
- Rate limiting.

## Known Limitations

- Project state is stored in memory and disappears when the backend restarts.
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

No license has been selected yet. Treat this repository as private proprietary work until a license is added.
