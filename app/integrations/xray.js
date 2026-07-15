const { request } = require("./http");

let cachedToken = null;
let tokenExpiry = 0;

async function authenticate(creds) {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const base = (creds.xray?.baseUrl || "https://xray.cloud.getxray.app/api/v2").replace(/\/$/, "");
  const res = await request(
    `${base}/authenticate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { client_id: creds.xray.clientId, client_secret: creds.xray.clientSecret }
  );
  cachedToken = typeof res.data === "string" ? res.data : res.data?.token || res.data;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return cachedToken;
}

async function graphql(creds, query, variables = {}) {
  const base = (creds.xray?.baseUrl || "https://xray.cloud.getxray.app/api/v2").replace(/\/$/, "");
  const token = await authenticate(creds);
  const res = await request(
    `${base}/graphql`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
    { query, variables }
  );
  if (res.data?.errors?.length) {
    throw new Error(res.data.errors.map((e) => e.message).join("; "));
  }
  return res.data.data;
}

async function testConnection(creds) {
  const data = await graphql(
    creds,
    `query { getTests(jql: "key = NONEXISTENT-999", limit: 1) { total } }`
  );
  return { ok: true, message: "XRay authenticated", data };
}

async function createTest(creds, { summary, description, testType, projectKey, labels }) {
  const type = testType || creds.xray?.testType || "Manual";
  const mutation = `
    mutation CreateTest($summary: String!, $description: String, $type: String!, $projectKey: String!) {
      createTest(
        testType: { name: $type }
        jira: {
          fields: {
            summary: $summary
            description: $description
            project: { key: $projectKey }
          }
        }
      ) {
        test { issueId jira(fields: ["key"]) }
        warnings
      }
    }`;
  const data = await graphql(creds, mutation, {
    summary,
    description: description || summary,
    type,
    projectKey: projectKey || creds.jira?.defaultProject || "VCPCORE",
  });
  const test = data?.createTest?.test;
  const key = test?.jira?.key || test?.issueId;
  return { key, warnings: data?.createTest?.warnings };
}

async function addTestsToTestSet(creds, testSetKey, testKeys) {
  const mutation = `
    mutation AddToSet($issueId: String!, $testIssueIds: [String!]!) {
      addTestsToTestSet(issueId: $issueId, testIssueIds: $testIssueIds) {
        addedTests
        warning
      }
    }`;
  return graphql(creds, mutation, { issueId: testSetKey, testIssueIds: testKeys });
}

async function publishTestCases(creds, story, testCases) {
  const approved = testCases.filter((tc) => tc.approved);
  const results = [];
  for (const tc of approved) {
    const desc = `Steps: ${tc.steps}\n\nExpected: ${tc.expected_result}\n\nLabel: ${tc.label}\nStory: ${story.key}`;
    const created = await createTest(creds, {
      summary: `[${tc.label}] ${tc.title}`,
      description: desc,
      projectKey: story.key.split("-")[0],
      labels: [tc.label, `story:${story.key}`],
    });
    tc.xray_key = created.key;
    results.push({ title: tc.title, xray_key: created.key, warnings: created.warnings });
  }
  return results;
}

async function publishSingleTestCase(creds, story, tc) {
  const steps = tc.steps_list?.length
    ? tc.steps_list
    : [{ action: tc.steps, data: "", expected: tc.expected_result }];
  const stepBlock = steps
    .map((s, i) => `Step ${i + 1}\nAction: ${s.action}\nData: ${s.data || "—"}\nExpected: ${s.expected}`)
    .join("\n\n");
  const desc = [
    tc.precondition ? `Precondition:\n${tc.precondition}` : "",
    tc.description ? `Description:\n${tc.description}` : "",
    stepBlock,
    `Label: ${tc.label}`,
    `Story: ${story.key}`,
    tc.reviewer ? `QA Reviewer: ${tc.reviewer}` : "",
  ].filter(Boolean).join("\n\n");
  return createTest(creds, {
    summary: `[${tc.label}] ${tc.title}`,
    description: desc,
    projectKey: story.key.split("-")[0],
    labels: [tc.label, `story:${story.key}`, tc.reviewer ? `reviewer:${tc.reviewer.replace(/\s+/g, "-")}` : ""].filter(Boolean),
  });
}

module.exports = { testConnection, createTest, addTestsToTestSet, publishTestCases, publishSingleTestCase, authenticate };
