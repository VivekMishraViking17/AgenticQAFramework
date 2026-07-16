# Agentic QE Framework

End-to-end AI-powered Quality Engineering lifecycle for VikingCloud — Cursor agents, Jira, Confluence, XRay, and Playwright automation.

**Repository:** [github.com/VivekMishraViking17/AgenticQAFramework](https://github.com/VivekMishraViking17/AgenticQAFramework)  
**Live URL (after Render deploy):** https://agenticqaframework.onrender.com  
**Deploy guide:** [DEPLOY.md](DEPLOY.md)

---

## Deliverables

| Artifact | Path | Description |
|----------|------|-------------|
| **Web Application** | `app/` | Full QE workflow platform (default: VC E2E Process) |
| **Deployment** | `deploy/` | LAN hosting, Docker, Microsoft Entra ID auth |
| **Marketing Web Page** | `web/index.html` | VikingCloud showcase site |
| **CXO Video** | `app/video/output/` | Generated briefing MP4 |
| **Master Plan** | `docs/FRAMEWORK_PLAN.md` | Framework documentation |

---

## Run locally (development)

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework\app
node server.js
# Open http://127.0.0.1:8080
```

Auth is **off** by default. Copy `app/.env.example` → `app/.env` to configure.

---

## Host for VikingCloud users

Share the platform on your corporate network with `@vikingcloud.com` Microsoft sign-in:

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework\app
Copy-Item .env.example .env
# Edit .env: AUTH_ENABLED=true, Azure credentials, PUBLIC_BASE_URL

..\deploy\host.ps1
```

Colleagues open the LAN URL shown in the console and sign in with Microsoft.

---

## Framework at a Glance

```
Jira Story → Knowledge → Test Design → QA Review → XRay → Automation → Execute → Defects
     ↑            ↑            ↑            ↑         ↑          ↑           ↑
 Story Agent  Knowledge    Design Agents  SME Gate  XRay MCP  Codegen   Triage Agent
```

---

## License

Internal use — Viking Cloud QE Engineering
