# Repository Guide — Agentic QE Framework

**Location:** `C:\Users\VivekMishra\agentic-qe-framework`  
**Owner:** Viking Cloud QE Engineering  
**Purpose:** End-to-end Agentic Quality Engineering platform for VCPCORE and programme delivery

---

## Repository structure

```
agentic-qe-framework/
├── README.md                 # Project overview
├── REPOSITORY.md             # This file — structure and conventions
├── .gitignore                # Root ignore rules (secrets, runtime data)
│
├── app/                      # ★ Main web application (Node.js)
│   ├── server.js             # HTTP server, API, static frontend
│   ├── auth/                 # Microsoft Entra ID sign-in for VikingCloud users
│   ├── frontend/             # SPA (Dashboard, E2E flow, CXO, Analysis, ROI)
│   ├── integrations/         # Jira, XRay, Confluence, metrics, CXO briefing
│   ├── config/               # credentials.example.json, seed JSON configs
│   ├── backend/              # Optional FastAPI + SQLite backend
│   ├── video/                # CXO briefing video generator
│   ├── .env.example          # Hosting & auth environment template
│   └── run.ps1               # Start server locally
│
├── deploy/                   # Hosting for VikingCloud users
│   ├── host.ps1              # LAN host script (firewall + start)
│   ├── open-firewall.ps1     # Windows inbound rule
│   ├── Dockerfile            # Container image
│   └── docker-compose.yml    # Docker deployment
│
├── docs/
│   ├── FRAMEWORK_PLAN.md     # Master QE framework plan
│   ├── VIKINGCLOUD_E2E_FLOW.md
│   └── DEPLOYMENT.md         # Hosting & Entra ID setup
│
├── web/                      # Static marketing / flow pages
└── presentation/             # Slide decks and PPTX generators
```

---

## What is committed vs local-only

| Committed to git | Never committed |
|------------------|-----------------|
| Source code, slides, docs | `app/config/credentials.json` |
| `credentials.example.json` | `app/.env` |
| Seed JSON (`board-defects.json`, etc.) | `app/data.json` (runtime stories) |
| Video scripts & slide HTML | Generated MP4 in `video/output/` |

---

## Running locally

```powershell
cd app
node server.js
# http://127.0.0.1:8080
```

## Hosting for VikingCloud users

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

1. Copy `app/.env.example` → `app/.env`
2. Configure Microsoft Entra ID + `AUTH_ENABLED=true`
3. Run `deploy/host.ps1`
4. Share LAN URL with `@vikingcloud.com` users

---

## Git workflow

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework
git status
git add .
git commit -m "Describe your change"
```

To push to a remote (GitHub/GitLab):

```powershell
git remote add origin <your-remote-url>
git push -u origin main
```

---

## Key integrations

| Service | Config | Module |
|---------|--------|--------|
| Jira | Integrations UI or `credentials.json` | `app/integrations/jira.js` |
| XRay | Same | `app/integrations/xray.js` |
| Confluence | Same | `app/integrations/confluence.js` |

Default Jira: `https://vikingcloud.atlassian.net` · Project: `VCPCORE`

---

## License

Internal use — Viking Cloud QE Engineering
