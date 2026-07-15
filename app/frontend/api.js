const API = "";

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid server response — restart the app using RESTART-APP.bat"
        : `Request failed (${res.status}) — restart the app if this persists`
    );
  }
  if (!res.ok) {
    if (res.status === 401 && data?.loginUrl) {
      window.location.href = data.loginUrl;
      throw new Error("Sign in required");
    }
    throw new Error(data?.detail || "Request failed");
  }
  return data;
}

export const Stories = {
  list: () => api("/api/stories"),
  get: (id) => api(`/api/stories/${id}`),
  create: (data) => api("/api/stories", { method: "POST", body: JSON.stringify(data) }),
  advance: (id) => api(`/api/stories/${id}/advance`, { method: "POST" }),
  generateTestCases: (id) => api(`/api/stories/${id}/generate-test-cases`, { method: "POST" }),
  review: (id, approved, notes) =>
    api(`/api/stories/${id}/review`, { method: "POST", body: JSON.stringify({ approved, notes }) }),
};

export const Dashboard = {
  stats: () => api("/api/dashboard/stats"),
};

export const Cxo = {
  briefing: () => api("/api/cxo/briefing"),
};

export const Catalog = {
  testCases: () => api("/api/test-cases"),
  defects: () => api("/api/defects"),
  defectAnalysis: () => api("/api/defects/analysis"),
  qaResources: () => api("/api/qa-resources"),
  updateTestCase: (storyId, tcId, data) =>
    api(`/api/stories/${storyId}/test-cases/${tcId}`, { method: "PATCH", body: JSON.stringify(data) }),
  uploadToXray: (storyId, tcId) =>
    api(`/api/stories/${storyId}/test-cases/${tcId}/upload-xray`, { method: "POST" }),
};

export const Integrations = {
  status: () => api("/api/integrations/status"),
  getCredentials: () => api("/api/integrations/credentials"),
  saveCredentials: (data) =>
    api("/api/integrations/credentials", { method: "POST", body: JSON.stringify(data) }),
  syncJira: () => api("/api/integrations/jira/sync", { method: "POST" }),
  testJira: () => api("/api/integrations/jira/test", { method: "POST" }),
  testXray: () => api("/api/integrations/xray/test", { method: "POST" }),
  jiraStories: () => api("/api/integrations/jira/stories"),
  jiraIssue: (key) => api(`/api/integrations/jira/issue/${encodeURIComponent(key)}`),
};
