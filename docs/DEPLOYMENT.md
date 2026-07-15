# Host Agentic QE Platform for VikingCloud users

Run the platform on your PC or internal server so colleagues on the corporate network can access it with their `@vikingcloud.com` Microsoft accounts.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 18+** | [nodejs.org](https://nodejs.org) or Cursor bundled Node |
| **Windows Firewall** | Port 8080 opened for inbound LAN (script included) |
| **Microsoft Entra ID app** | For production auth (see below) |
| **Jira/XRay credentials** | Optional — configure in Integrations UI after login |

## Quick start (local / LAN)

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework\app

# 1. Copy environment template
Copy-Item .env.example .env

# 2. Edit .env — set PUBLIC_BASE_URL to your machine's LAN IP
#    Example: PUBLIC_BASE_URL=http://192.168.1.50:8080

# 3. For VikingCloud user access, enable auth:
#    AUTH_ENABLED=true
#    AZURE_TENANT_ID=...
#    AZURE_CLIENT_ID=...
#    AZURE_CLIENT_SECRET=...
#    SESSION_SECRET=<random 64-char hex>

# 4. Start hosted server
..\deploy\host.ps1
```

Share the URL shown in the console (e.g. `http://192.168.1.50:8080`) with VikingCloud colleagues.

## Microsoft Entra ID setup

1. Open [Microsoft Entra admin center](https://entra.microsoft.com) → **App registrations** → **New registration**
2. Name: `VikingCloud Agentic QE Platform`
3. Supported account types: **Accounts in this organizational directory only**
4. Redirect URI (Web): `http://<YOUR-HOST>:8080/auth/callback`  
   (Must match `PUBLIC_BASE_URL` in `.env` exactly)
5. After creation, note **Application (client) ID** and **Directory (tenant) ID**
6. **Certificates & secrets** → New client secret → copy value to `AZURE_CLIENT_SECRET`
7. **API permissions** → Add `Microsoft Graph` → Delegated: `User.Read`, `openid`, `profile`, `email`
8. Grant admin consent for VikingCloud tenant

Only users with `@vikingcloud.com` email (configurable via `ALLOWED_EMAIL_DOMAINS`) can sign in.

## Docker deployment

```powershell
cd C:\Users\VivekMishra\agentic-qe-framework
Copy-Item app\.env.example app\.env
# Edit app\.env with auth and PUBLIC_BASE_URL

docker compose -f deploy\docker-compose.yml up -d --build
```

## Windows firewall

```powershell
.\deploy\open-firewall.ps1 -Port 8080
```

## Development mode (no auth)

Leave `AUTH_ENABLED=false` in `.env` for local-only development on your machine.

## Health check

```
GET http://<host>:8080/health
→ {"status":"ok"}
```

## Security notes

- Never commit `app/.env` or `app/config/credentials.json`
- Use HTTPS in production (reverse proxy with TLS termination)
- Rotate `SESSION_SECRET` and Azure client secrets periodically
- Restrict firewall to corporate VLAN where possible

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Colleagues cannot reach URL | Check firewall, confirm `HOST=0.0.0.0`, verify LAN IP |
| Microsoft login redirect error | `PUBLIC_BASE_URL` must match Entra redirect URI exactly |
| Access denied after login | User email domain must be in `ALLOWED_EMAIL_DOMAINS` |
| Jira sync fails | Configure credentials in Integrations (admin users only) |
