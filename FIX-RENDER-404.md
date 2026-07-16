# Fix "Not Found" on agenticqaframework.onrender.com

That 404 means **Render has no deployed service yet**. The URL only works after you deploy once.

## Deploy now (5 minutes, free)

### Step 1 — Open Render
https://dashboard.render.com/register

Sign up with **GitHub** (same account as VivekMishraViking17).

### Step 2 — New Blueprint
https://dashboard.render.com/blueprint/new

- Click **Connect account** → authorize GitHub
- Select repo: **VivekMishraViking17 / AgenticQAFramework**
- Click **Apply**

Render reads `render.yaml` automatically. Access code is already set to `VC-QE-2026`.

### Step 3 — Wait for "Live"
Dashboard shows **agenticqaframework** → status **Live** (~3–5 min).

### Step 4 — Open
https://agenticqaframework.onrender.com

Sign in: `@vikingcloud.com` + `VC-QE-2026`

---

## Still 404 after deploy?

Check Render dashboard → **agenticqaframework** → **Logs**. Common fixes:

| Log error | Fix |
|-----------|-----|
| Build failed | Pull latest `main` from GitHub |
| Port error | Already fixed — uses PORT 10000 |
| Crash on start | Check Logs tab for stack trace |

---

## Works immediately (no Render)

**https://low-feelings-preston-railway.trycloudflare.com**  
(Keep your PC on. Same login.)

Restart tunnel:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\VivekMishra\agentic-qe-framework\deploy\start-public.ps1
```
