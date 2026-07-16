# VikingCloud branded URL (no personal GitHub username)

## Target URL

**https://vikingcloud.github.io/agenticframework/**

Looks like: **VikingCloud / AgenticFramework** — not your personal GitHub name.

---

## One-time setup (~5 minutes)

### Step 1 — Create VikingCloud GitHub Organization (free)

1. Open: https://github.com/organizations/plan?plan=free
2. Organization name: **`vikingcloud`** (lowercase)
3. Contact email: your `@vikingcloud.com` work email
4. Complete setup (Free plan)

### Step 2 — Transfer this repo to the org

1. Open: https://github.com/VivekMishraViking17/AgenticQAFramework/settings
2. Scroll to **Danger Zone** → **Transfer ownership**
3. New owner: **`vikingcloud`**
4. Confirm transfer

### Step 3 — Rename repo to `agenticframework`

1. Open: https://github.com/vikingcloud/AgenticQAFramework/settings
2. **Repository name** → change to: **`agenticframework`**
3. Click **Rename**

### Step 4 — Enable GitHub Pages

1. Open: https://github.com/vikingcloud/agenticframework/settings/pages
2. **Source** → **Deploy from a branch**
3. Branch: **main** · Folder: **`/docs`**
4. Save

Wait 2–5 minutes.

---

## Your branded link

**https://vikingcloud.github.io/agenticframework/**

Sign in: `@vikingcloud.com` + `VC-QE-2026`

---

## After transfer — update your local git remote

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework
git remote set-url origin https://github.com/vikingcloud/agenticframework.git
```

---

## Optional later (custom domain, needs ~$10 or IT)

**https://agenticframework.vikingcloud.com** — add CNAME in Cloudflare/DNS pointing to `vikingcloud.github.io`

GitHub → repo Settings → Pages → Custom domain → `agenticframework.vikingcloud.com`
