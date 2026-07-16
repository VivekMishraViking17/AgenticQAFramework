# Fix 404 on GitHub Pages

GitHub Pages **404** almost always means one of these:

## Fix 1 — Make repo PUBLIC (required for free Pages)

Your repo is **private**, so `github.io` returns 404 to everyone.

1. Open: https://github.com/VivekMishraViking17/AgenticQAFramework/settings
2. Scroll to **Danger Zone** → **Change repository visibility**
3. Select **Public** → confirm

> Safe: `.env` and `credentials.json` are in `.gitignore` and were never pushed.

## Fix 2 — Enable Pages from /docs

1. Open: https://github.com/VivekMishraViking17/AgenticQAFramework/settings/pages
2. **Source** → **Deploy from a branch**
3. Branch: **main** · Folder: **/docs**
4. Click **Save**

Wait **2–5 minutes**, then open:

**https://vivekmishraviking17.github.io/AgenticQAFramework/**

## Fix 3 — Re-run Actions (optional)

If you prefer GitHub Actions instead of branch deploy:

1. Pages source: **GitHub Actions**
2. Actions tab → **Deploy GitHub Pages** → **Re-run all jobs**

---

## Works immediately (no GitHub Pages)

**https://oliver-peers-trusted-attitude.trycloudflare.com/auth/login.html**

Login: `@vikingcloud.com` + `VC-QE-2026` (keep PC on)
