const { request, jiraAuthHeader } = require("./http");

const DEFAULT_QA_GROUP = "QA Team";

async function fetchQaTeamMembers(creds, groupName = DEFAULT_QA_GROUP) {
  const base = creds.jira.baseUrl.replace(/\/$/, "");
  const headers = {
    ...jiraAuthHeader(creds.jira.email, creds.jira.apiToken),
    Accept: "application/json",
  };
  const names = new Set();
  let startAt = 0;
  const maxResults = 50;
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      groupname: groupName,
      startAt: String(startAt),
      maxResults: String(maxResults),
    });
    const res = await request(`${base}/rest/api/3/group/member?${params}`, { headers });
    const members = res.data.values || [];
    members.forEach((u) => {
      const name = (u.displayName || u.name || "").trim();
      if (name) names.add(name);
    });
    if (members.length < maxResults) break;
    startAt += maxResults;
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

module.exports = { fetchQaTeamMembers, DEFAULT_QA_GROUP };
