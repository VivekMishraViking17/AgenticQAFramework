/**
 * VikingCloud access control — Microsoft Entra ID (Azure AD) + email domain allowlist.
 * Zero npm dependencies.
 */
const crypto = require("crypto");
const https = require("https");
const querystring = require("querystring");
const fs = require("fs");
const path = require("path");

const LOGIN_HTML = path.join(__dirname, "login.html");
const pendingStates = new Map();

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function getConfig() {
  const port = process.env.PORT || "8080";
  return {
    enabled: process.env.AUTH_ENABLED === "true",
    authMode: (process.env.AUTH_MODE || "microsoft").toLowerCase(),
    tenantId: process.env.AZURE_TENANT_ID || "",
    clientId: process.env.AZURE_CLIENT_ID || "",
    clientSecret: process.env.AZURE_CLIENT_SECRET || "",
    accessCode: process.env.ACCESS_CODE || "",
    allowedDomains: (process.env.ALLOWED_EMAIL_DOMAINS || "vikingcloud.com")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
    sessionSecret: process.env.SESSION_SECRET || "",
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/$/, ""),
    cookieName: "aqe_session",
    sessionHours: Number(process.env.SESSION_HOURS || 8),
  };
}

function isEnabled() {
  return getConfig().enabled;
}

function isAzureConfigured(cfg = getConfig()) {
  return !!(cfg.tenantId && cfg.clientId && cfg.clientSecret);
}

function httpsJson(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            return reject(new Error(`Invalid JSON from ${url.hostname}`));
          }
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error_description || parsed.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function httpsFormPost(urlStr, form) {
  const body = querystring.stringify(form);
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            return reject(new Error(`Invalid JSON from ${url.hostname}`));
          }
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error_description || parsed.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sessionSecret(cfg) {
  if (cfg.sessionSecret) return cfg.sessionSecret;
  return crypto.createHash("sha256").update("aqe-dev-only-change-SESSION_SECRET").digest("hex");
}

function signSession(payload, cfg) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret(cfg)).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}

function getSession(req) {
  const cfg = getConfig();
  const cookies = parseCookies(req);
  const token = cookies[cfg.cookieName];
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", sessionSecret(cfg)).update(body).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(res, user, cfg = getConfig()) {
  const exp = Date.now() + cfg.sessionHours * 60 * 60 * 1000;
  const payload = {
    email: user.email,
    name: user.name || user.email,
    sub: user.sub || user.email,
    exp,
  };
  const token = signSession(payload, cfg);
  const secure = cfg.publicBaseUrl.startsWith("https");
  const parts = [
    `${cfg.cookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${cfg.sessionHours * 3600}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res, cfg = getConfig()) {
  res.setHeader("Set-Cookie", `${cfg.cookieName}=; Path=/; HttpOnly; Max-Age=0`);
}

function isAllowedEmail(email, cfg = getConfig()) {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@").pop().toLowerCase();
  return cfg.allowedDomains.includes(domain);
}

function isPublicPath(pathname, method) {
  if (pathname === "/health") return true;
  if (pathname === "/auth/login.html" || pathname === "/login.html") return true;
  if (pathname.startsWith("/auth/")) return true;
  if (method === "GET" && ["/styles.css"].includes(pathname)) return true;
  return false;
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function sendLoginPage(res, cfg = getConfig()) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  if (cfg.authMode === "access_code") {
    res.end(buildAccessCodeLoginHtml(cfg));
  } else {
    res.end(fs.readFileSync(LOGIN_HTML, "utf8"));
  }
}

function buildAccessCodeLoginHtml(cfg, errorMsg = "") {
  const domains = cfg.allowedDomains.map((d) => `@${escHtml(d)}`).join(", ");
  const err = errorMsg ? `<div class="err">${escHtml(errorMsg)}</div>` : "";
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Sign in | QE Agentic Framework VikingCloud</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;font-family:Inter,Segoe UI,sans-serif;background:linear-gradient(135deg,#0a1628,#1d3c83 55%,#23569a);display:flex;align-items:center;justify-content:center;color:#fff;padding:24px}
.card{width:100%;max-width:440px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:40px 36px;box-shadow:0 24px 48px rgba(0,0,0,.25)}
.brand{font-family:Poppins,sans-serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#66fcf9;margin-bottom:8px}
h1{font-family:Poppins,sans-serif;font-size:28px;margin-bottom:8px}
p{color:rgba(255,255,255,.75);font-size:14px;line-height:1.6;margin-bottom:20px}
label{display:block;font-size:12px;color:rgba(255,255,255,.6);margin-bottom:6px}
input{width:100%;padding:12px 14px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(0,0,0,.2);color:#fff;font-size:14px;margin-bottom:16px}
input:focus{outline:2px solid #66fcf9;border-color:transparent}
.btn{width:100%;padding:14px;border:none;border-radius:10px;background:#fff;color:#1d3c83;font-size:15px;font-weight:600;cursor:pointer}
.btn:hover{box-shadow:0 8px 24px rgba(0,0,0,.2)}
.note{margin-top:20px;font-size:12px;color:rgba(255,255,255,.5);text-align:center;line-height:1.5}
.err{background:rgba(204,36,21,.25);border:1px solid rgba(204,36,21,.5);padding:10px 12px;border-radius:8px;font-size:13px;margin-bottom:16px}
</style></head><body>
<div class="card">
  <div class="brand">VikingCloud</div>
  <h1>QE Agentic Framework</h1>
  <p>Enter your VikingCloud email and the team access code.</p>
  ${err}
  <form method="POST" action="/auth/login">
    <label for="email">Work email (${domains})</label>
    <input id="email" name="email" type="email" required placeholder="you.name@vikingcloud.com"/>
    <label for="access_code">Team access code</label>
    <input id="access_code" name="access_code" type="password" required autocomplete="current-password"/>
    <button class="btn" type="submit">Sign in</button>
  </form>
  <p class="note">Access restricted to VikingCloud accounts.<br/>Contact QE Engineering for the access code.</p>
</div></body></html>`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      try {
        if (!buf) return resolve({});
        const ct = req.headers["content-type"] || "";
        if (ct.includes("application/json")) {
          resolve(JSON.parse(buf));
        } else {
          resolve(Object.fromEntries(new URLSearchParams(buf)));
        }
      } catch {
        reject(new Error("Invalid request body"));
      }
    });
    req.on("error", reject);
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

async function handleAccessCodeLogin(req, res, cfg = getConfig()) {
  if (!cfg.accessCode) {
    res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
    return res.end("<h1>Access code not configured</h1><p>Set ACCESS_CODE in app/.env</p>");
  }
  try {
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.access_code || body.accessCode || "");
    if (!isAllowedEmail(email, cfg) || !safeEqual(code, cfg.accessCode)) {
      res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(buildAccessCodeLoginHtml(cfg, "Invalid email or access code."));
    }
    const name = email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    setSessionCookie(res, { email, name, sub: email }, cfg);
    redirect(res, "/");
  } catch (e) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Sign-in error</h1><p>${escHtml(e.message)}</p>`);
  }
}

function startMicrosoftLogin(res, cfg = getConfig()) {
  if (!isAzureConfigured(cfg)) {
    res.writeHead(503, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      detail: "Microsoft Entra ID is not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET in app/.env",
    }));
  }
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now());
  for (const [k, t] of pendingStates) {
    if (Date.now() - t > 600000) pendingStates.delete(k);
  }
  const redirectUri = `${cfg.publicBaseUrl}/auth/callback`;
  const params = querystring.stringify({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "openid profile email User.Read",
    state,
  });
  redirect(res, `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/authorize?${params}`);
}

async function handleCallback(req, res, url) {
  const cfg = getConfig();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (err) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`<h1>Sign-in failed</h1><p>${escHtml(err)}</p><p><a href="/auth/login.html">Try again</a></p>`);
  }
  if (!code || !state || !pendingStates.has(state)) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    return res.end("<h1>Invalid sign-in session</h1><p><a href=\"/auth/login.html\">Try again</a></p>");
  }
  pendingStates.delete(state);
  const redirectUri = `${cfg.publicBaseUrl}/auth/callback`;
  try {
    const token = await httpsFormPost(
      `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
      {
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }
    );
    const profile = await httpsJson("GET", "https://graph.microsoft.com/v1.0/me", {
      Authorization: `Bearer ${token.access_token}`,
    });
    const email = (profile.mail || profile.userPrincipalName || "").toLowerCase();
    if (!isAllowedEmail(email, cfg)) {
      res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(
        `<h1>Access denied</h1><p>Only VikingCloud accounts (${cfg.allowedDomains.join(", ")}) may use this platform.</p>`
      );
    }
    setSessionCookie(res, { email, name: profile.displayName, sub: profile.id }, cfg);
    redirect(res, "/");
  } catch (e) {
    res.writeHead(502, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Authentication error</h1><p>${escHtml(e.message)}</p><p><a href="/auth/login.html">Try again</a></p>`);
  }
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function authMiddleware(req, res, url) {
  const cfg = getConfig();
  const pathname = url.pathname;

  if (pathname === "/api/auth/me") {
    const session = cfg.enabled ? getSession(req) : null;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      authRequired: cfg.enabled,
      authMode: cfg.authMode,
      authenticated: cfg.enabled ? !!session : true,
      azureConfigured: isAzureConfigured(cfg),
      accessCodeConfigured: cfg.authMode === "access_code" && !!cfg.accessCode,
      allowedDomains: cfg.allowedDomains,
      user: session ? { email: session.email, name: session.name } : null,
    }));
    return { handled: true };
  }

  if (!cfg.enabled) return { ok: true, user: null, authRequired: false };

  const session = getSession(req);

  if (pathname === "/auth/login.html" || pathname === "/login.html") {
    sendLoginPage(res, cfg);
    return { handled: true };
  }
  if (pathname === "/auth/login" && req.method === "POST" && cfg.authMode === "access_code") {
    await handleAccessCodeLogin(req, res, cfg);
    return { handled: true };
  }
  if (pathname === "/auth/start" && req.method === "GET" && cfg.authMode === "microsoft") {
    startMicrosoftLogin(res, cfg);
    return { handled: true };
  }
  if (pathname === "/auth/callback" && req.method === "GET") {
    handleCallback(req, res, url);
    return { handled: true };
  }
  if (pathname === "/auth/logout" && req.method === "GET") {
    clearSessionCookie(res, cfg);
    redirect(res, "/auth/login.html");
    return { handled: true };
  }

  if (isPublicPath(pathname, req.method)) {
    return { ok: true, user: session, authRequired: true };
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ detail: "Sign in required", loginUrl: "/auth/login.html" }));
      return { handled: true };
    }
    redirect(res, "/auth/login.html");
    return { handled: true };
  }

  return { ok: true, user: session, authRequired: true };
}

loadDotEnv();

module.exports = {
  loadDotEnv,
  getConfig,
  isEnabled,
  isAzureConfigured,
  getSession,
  authMiddleware,
  isPublicPath,
};
