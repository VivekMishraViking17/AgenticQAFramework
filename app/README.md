# Agentic QE Platform

End-to-end web application for the Agentic Quality Engineering framework.

## Quick Start (Node.js — no npm required)

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework\app
node server.js
```

Open: **http://127.0.0.1:8080**

Or use the run script:

```powershell
.\run.ps1
```

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | KPIs, phase distribution, ROI metrics |
| **Jira Stories** | Create stories with AC/DOD, drive 8-phase workflow |
| **Review Queue** | QA SME approve/reject gate |
| **Test Cases** | Auto-generated labeled TCs (8 categories) |
| **Defects** | Auto-filed Jira bugs from execution |
| **Lifecycle** | Agile circular diagram |
| **RACI Matrix** | Role responsibilities |
| **ROI Projection** | Year 1 business value |

## End-to-End Workflow

1. **Create story** with acceptance criteria and DOD
2. Click **Run Agent & Advance** through each phase:
   - Intake → Knowledge → **Design** (auto-generates 8 labeled TCs) → Review
3. Switch role to **QA SME** → **Approve** or **Reject** in Review Queue
4. After approval, **Advance** again → XRay → Auto Plan → Codegen → Execute
5. **Defects** auto-filed on execution; view on Defects page

## Role Switcher

Use the sidebar dropdown to simulate:
- **QE Lead** — workflow ownership, can approve reviews
- **QA SME** — mandatory test design review gate
- **SDET** — automation phases
- **PO / Dev / QE Ops** — RACI-aligned views

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories` | List all stories |
| POST | `/api/stories` | Create new story |
| GET | `/api/stories/{id}` | Story detail |
| POST | `/api/stories/{id}/advance` | Run agent + advance phase |
| POST | `/api/stories/{id}/review` | SME approve/reject |
| GET | `/api/dashboard/stats` | Dashboard KPIs |
| GET | `/api/test-cases` | All test cases |
| GET | `/api/defects` | All defects |

## Stack

- **Server:** Node.js (zero npm dependencies)
- **Storage:** `data.json` (JSON file persistence)
- **Frontend:** Vanilla JS SPA, VikingCloud theme
- **Agents:** Simulated orchestration (ready for MCP integration)

## Optional Python Backend

A FastAPI backend is also available in `backend/` if Python is installed:

```powershell
pip install -r requirements.txt
uvicorn backend.main:app --port 8080
```
