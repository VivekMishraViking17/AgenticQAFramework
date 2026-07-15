const fs = require("fs");
const path = require("path");

const CONFIG_DIR = path.join(__dirname, "..", "config");
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json");
const EXAMPLE_FILE = path.join(CONFIG_DIR, "credentials.example.json");

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function loadCredentials() {
  ensureConfigDir();
  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));
    } catch {
      return {};
    }
  }
  if (fs.existsSync(EXAMPLE_FILE)) {
    const ex = JSON.parse(fs.readFileSync(EXAMPLE_FILE, "utf8"));
    return { ...ex, _isExample: true };
  }
  return {};
}

function saveCredentials(data) {
  ensureConfigDir();
  const current = loadCredentials();
  const base = current._isExample ? {} : { ...current };
  delete base._isExample;
  const merged = deepMerge(base, data);
  // Preserve secrets when form leaves password fields empty
  const secretFields = [
    ["jira", "apiToken"],
    ["xray", "clientId"],
    ["xray", "clientSecret"],
    ["github", "token"],
  ];
  for (const [section, field] of secretFields) {
    if (!data?.[section]?.[field] && base[section]?.[field]) {
      merged[section] = merged[section] || {};
      merged[section][field] = base[section][field];
    }
  }
  if (!data?.jira?.email && base.jira?.email && String(data?.jira?.email || "").includes("***") === false) {
    if (!data.jira) merged.jira = merged.jira || {};
    if (!data.jira?.email) merged.jira.email = base.jira.email;
  }
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
  return maskCredentials(merged);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const [k, v] of Object.entries(source || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] || {}, v);
    } else if (v !== undefined && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

function maskSecret(val) {
  if (!val || typeof val !== "string") return "";
  if (val.length <= 8) return "********";
  return val.slice(0, 4) + "..." + val.slice(-4);
}

function maskCredentials(creds) {
  const c = JSON.parse(JSON.stringify(creds));
  if (c.jira?.apiToken) c.jira.apiToken = maskSecret(c.jira.apiToken);
  if (c.jira?.email) c.jira.email = c.jira.email.replace(/(.{2}).*(@.*)/, "$1***$2");
  if (c.xray?.clientSecret) c.xray.clientSecret = maskSecret(c.xray.clientSecret);
  if (c.xray?.clientId) c.xray.clientId = maskSecret(c.xray.clientId);
  if (c.github?.token) c.github.token = maskSecret(c.github.token);
  return c;
}

function isJiraConfigured(creds) {
  return !!(creds?.jira?.baseUrl && creds?.jira?.email && creds?.jira?.apiToken && !creds._isExample);
}

function isXrayConfigured(creds) {
  return !!(creds?.xray?.clientId && creds?.xray?.clientSecret && !creds._isExample);
}

module.exports = {
  loadCredentials,
  saveCredentials,
  maskCredentials,
  isJiraConfigured,
  isXrayConfigured,
  CREDENTIALS_FILE,
};
