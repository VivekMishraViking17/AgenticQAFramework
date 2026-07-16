# Custom domain: qeagenticframeworkvikingcloud.com

Target URL: **https://qeagenticframeworkvikingcloud.com**

The random `trycloudflare.com` link cannot be renamed. A custom `.com` needs **domain registration + DNS**. Steps below (~15 min once you own the domain).

---

## Step 1 — Register the domain

1. Go to [Cloudflare Registrar](https://dash.cloudflare.com/?to=/:account/domains/register) or Namecheap.
2. Search and buy: **qeagenticframeworkvikingcloud.com** (~$10–15/year).
3. If using Cloudflare Registrar, nameservers are automatic.  
   If using Namecheap, point nameservers to Cloudflare (free Cloudflare account).

---

## Step 2 — Cloudflare Tunnel (one-time)

Open PowerShell **as yourself** (browser login required):

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework\deploy

# Log in to Cloudflare (opens browser)
.\cloudflared.exe tunnel login

# Create named tunnel
.\cloudflared.exe tunnel create qe-agentic-vc

# Route DNS to your domain (Cloudflare must host the zone)
.\cloudflared.exe tunnel route dns qe-agentic-vc qeagenticframeworkvikingcloud.com
.\cloudflared.exe tunnel route dns qe-agentic-vc www.qeagenticframeworkvikingcloud.com
```

---

## Step 3 — Start app + tunnel

Terminal 1 — app server:

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework\app
node server.js
```

Terminal 2 — custom domain tunnel:

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework\deploy
.\cloudflared.exe tunnel --config cloudflared-config.yml run qe-agentic-vc
```

Or use the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\VivekMishra\agentic-qe-framework\deploy\start-custom-domain.ps1
```

---

## Step 4 — Verify

Open: **https://qeagenticframeworkvikingcloud.com**

Sign in: `@vikingcloud.com` email + access code `VC-QE-2026`

---

## Easier alternative (if VikingCloud IT manages DNS)

Ask IT for a subdomain instead of buying a new domain:

- **https://qe-agentic.vikingcloud.com** or **https://agentic-qe.vikingcloud.com**

Same Cloudflare Tunnel steps, but IT adds the CNAME to Cloudflare. No domain purchase needed.

---

## Current temporary URL (until custom domain is live)

https://employees-standings-teaching-behaviour.trycloudflare.com

Keep using this until Steps 1–3 are complete.
