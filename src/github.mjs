// Minimal GitHub REST client. Uses GITHUB_TOKEN, else `gh auth token`, else
// goes unauthenticated (search is then limited to 10 requests a minute).
import { execFileSync } from "node:child_process";

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export function githubClient(fetchImpl = fetch) {
  const auth = token();
  const headers = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    ...(auth ? { authorization: `Bearer ${auth}` } : {}),
  };

  async function get(path) {
    const res = await fetchImpl(`https://api.github.com${path}`, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}: ${await res.text()}`);
    return res.json();
  }

  return {
    searchIssues: (query, perPage) =>
      get(`/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}`),
    repo: (fullName) => get(`/repos/${fullName}`),
    timeline: (fullName, number) => get(`/repos/${fullName}/issues/${number}/timeline?per_page=100`),
    // Returns the decoded text of a file, or null if it does not exist.
    async file(fullName, path) {
      const data = await get(`/repos/${fullName}/contents/${path}`);
      if (!data || Array.isArray(data) || !data.content) return null;
      return Buffer.from(data.content, "base64").toString("utf8");
    },
  };
}
