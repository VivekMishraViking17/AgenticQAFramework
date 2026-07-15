const { request, jiraAuthHeader, extractAdfText } = require("./http");

function wikiBase(creds) {
  return creds.jira.baseUrl.replace(/\/$/, "");
}

function headers(creds) {
  return {
    ...jiraAuthHeader(creds.jira.email, creds.jira.apiToken),
    Accept: "application/json",
  };
}

async function search(creds, query, limit = 10) {
  const base = wikiBase(creds);
  const spaces = (creds.confluence?.defaultSpaces || []).join(",");
  let cql = `text ~ "${query.replace(/"/g, '\\"')}" AND type = page`;
  if (spaces) cql += ` AND space in (${spaces})`;
  const params = new URLSearchParams({ cql, limit: String(limit), expand: "body.storage" });
  const res = await request(`${base}/wiki/rest/api/content/search?${params}`, { headers: headers(creds) });
  return (res.data.results || []).map((page) => ({
    id: page.id,
    title: page.title,
    space: page._expandable?.space || "",
    url: `${base}/wiki${page._links?.webui || ""}`,
    excerpt: page.body?.storage?.value
      ? page.body.storage.value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400)
      : "",
  }));
}

async function getPage(creds, pageId) {
  const base = wikiBase(creds);
  const res = await request(
    `${base}/wiki/rest/api/content/${pageId}?expand=body.storage`,
    { headers: headers(creds) }
  );
  const html = res.data.body?.storage?.value || "";
  return {
    id: res.data.id,
    title: res.data.title,
    text: html.replace(/<[^>]+>/g, "\n").replace(/\s+/g, " ").trim(),
    url: `${base}/wiki${res.data._links?.webui || ""}`,
  };
}

async function gatherContext(creds, story) {
  const terms = [story.component, story.title].filter(Boolean);
  const query = terms.join(" ").split(/\s+/).slice(0, 6).join(" ");
  const pages = await search(creds, query, 5);
  if (!pages.length) return { query, pages: [], summary: "No Confluence pages found for this story." };
  const lines = pages.map((p) => `- [${p.title}](${p.url}): ${p.excerpt.slice(0, 120)}...`);
  return {
    query,
    pages,
    summary: `Confluence context (${pages.length} pages):\n${lines.join("\n")}`,
  };
}

module.exports = { search, getPage, gatherContext };
