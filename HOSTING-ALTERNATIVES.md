# Expose Agentic QE via Cloudflare Tunnel (no firewall / no Azure)

Requires a free [Cloudflare](https://dash.cloudflare.com) account and `cloudflared` installed:

```powershell
winget install Cloudflare.cloudflared
```

## Steps

1. Start the app locally:
   ```powershell
   cd C:\Users\VivekMishra\agentic-qe-framework\app
   node server.js
   ```

2. In another terminal, run the tunnel:
   ```powershell
   cloudflared tunnel --url http://127.0.0.1:8080
   ```

3. Cloudflare prints a public URL like `https://random-words.trycloudflare.com` — share that with VikingCloud colleagues.

4. Set auth in `app\.env`:
   ```env
   AUTH_ENABLED=true
   AUTH_MODE=access_code
   ACCESS_CODE=YourTeamSecret2026
   PUBLIC_BASE_URL=https://random-words.trycloudflare.com
   ```

5. Restart the app.

## Notes

- The URL changes each time unless you configure a named Cloudflare tunnel with a custom domain.
- For a stable URL, use Cloudflare Zero Trust → Tunnels → assign `qe.vikingcloud.com` (needs DNS admin).
- Pair with `AUTH_MODE=access_code` so colleagues only need email + team code.
