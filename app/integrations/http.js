const https = require("https");
const http = require("http");
const { URL } = require("url");

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        method: options.method || "GET",
        headers: options.headers || {},
        timeout: options.timeout || 30000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed = data;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            /* text */
          }
          if (res.statusCode >= 400) {
            const msg = typeof parsed === "object" ? JSON.stringify(parsed) : data;
            reject(new Error(`HTTP ${res.statusCode}: ${msg.slice(0, 500)}`));
          } else {
            resolve({ status: res.statusCode, data: parsed, headers: res.headers });
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Request timeout")));
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function jiraAuthHeader(email, apiToken) {
  const token = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return { Authorization: `Basic ${token}`, Accept: "application/json" };
}

function adfParagraph(text) {
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text: String(text || "") }] }],
  };
}

function extractAdfText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractAdfText).join("\n");
  return "";
}

module.exports = { request, jiraAuthHeader, adfParagraph, extractAdfText };
