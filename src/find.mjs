// Finds open issues whose maintainers invited spare-quota help, and explains
// every issue it skips.

export const OWN_LABEL = "spare-quota-welcome";
// Labels other projects use with no shared meaning; listed separately.
export const OTHER_LABELS = ["agent-friendly", "ai-friendly", "ai-welcome"];

const POLICY_FILES = [
  "AI_POLICY.md",
  "CONTRIBUTING.md",
  ".github/CONTRIBUTING.md",
  "docs/CONTRIBUTING.md",
];

// Sentences that suggest a project refuses AI-generated contributions. A hit
// is shown with its quote for a person to judge; it is a heuristic, not a ruling.
const BAN_PATTERNS = [
  /\b(do not|don't|will not|won't|cannot|can't|not)\s+(accept|allow|permit|merge)\b[^.\n]{0,80}\b(ai|llm|chatgpt|copilot|generated|machine)/i,
  /\b(ai|llm)[- ]generated\b[^.\n]{0,60}\b(not (be )?(accepted|allowed|permitted)|prohibited|banned|forbidden|rejected)/i,
  /\b(prohibit|ban|forbid)s?\b[^.\n]{0,60}\b(ai|llm|generated)/i,
];

export function findBan(text) {
  if (!text) return null;
  for (const pattern of BAN_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

// Open pull requests that mention the issue, from its timeline.
export function openLinkedPrs(timeline) {
  return (timeline ?? [])
    .filter((e) => e.event === "cross-referenced" && e.source?.issue?.pull_request && e.source.issue.state === "open")
    .map((e) => e.source.issue.html_url);
}

// Work an agent cannot finish as one reviewable PR: open questions and research,
// or tasks too big for one sitting. Matched on labels and titles.
const NOT_A_FIX_LABEL = /\b(spike|research|investigat\w*|discussion|question|rfc|proposal|design|epic|tracking|meta|roadmap|needs[- ](design|decision|discussion|triage))\b/i;
const NOT_A_FIX_TITLE = /^\s*(\[?(spike|research|rfc|proposal|discussion|question|epic|tracking|meta)\b|investigate\b|explore\b)|\b(spike|rfc)\b|\?\s*$/i;
const LARGE_LABEL = /\b(size|effort|complexity|estimate)\W*(l|xl|xxl|large|high|hard|big|[5-9]|1\d)\b|\b(large|xl|hard)\b/i;
const LARGE_TITLE = /\b(decompile|rewrite|port|migrate)\b.*\b(whole|entire|all|version|game)\b/i;
const MAX_CHECKLIST = 5;

export function scopeReason(issue) {
  const labels = (issue.labels ?? []).map((l) => l.name);
  const notFix = labels.find((name) => NOT_A_FIX_LABEL.test(name));
  if (notFix) return `not a fix: labelled "${notFix}"`;
  if (NOT_A_FIX_TITLE.test(issue.title ?? "")) return "not a fix: title reads as a spike, research or question";
  const large = labels.find((name) => LARGE_LABEL.test(name));
  if (large) return `too large: labelled "${large}"`;
  if (LARGE_TITLE.test(issue.title ?? "")) return "too large: title describes a whole-project job";
  const checklist = (issue.body ?? "").match(/^\s*[-*] \[[ xX]\]/gm)?.length ?? 0;
  if (checklist > MAX_CHECKLIST) return `too large: ${checklist}-item checklist`;
  return null;
}

// Decides one issue from facts already fetched. Returns null to offer it,
// or a reason to skip it.
export function skipReason({ issue, repo, ban, linkedPrs }) {
  if (!repo) return "repository not readable";
  if (repo.archived) return "repository archived";
  if (issue.assignees?.length) return `assigned to ${issue.assignees.map((a) => a.login).join(", ")}`;
  if (issue.labels?.some((l) => /good first issue/i.test(l.name))) {
    return "labelled good first issue (kept for human newcomers)";
  }
  const scope = scopeReason(issue);
  if (scope) return scope;
  if (linkedPrs.length) return `open PR already: ${linkedPrs[0]}`;
  if (ban) return `rules may forbid AI contributions: "${ban.quote}" (${ban.file})`;
  return null;
}

export async function findIssues(github, { labels = [OWN_LABEL, ...OTHER_LABELS], perLabel = 10 } = {}) {
  const repoCache = new Map();

  async function repoFacts(fullName) {
    if (!repoCache.has(fullName)) {
      repoCache.set(
        fullName,
        (async () => {
          const repo = await github.repo(fullName);
          let ban = null;
          for (const file of POLICY_FILES) {
            const quote = findBan(await github.file(fullName, file));
            if (quote) {
              ban = { file, quote };
              break;
            }
          }
          return { repo, ban };
        })(),
      );
    }
    return repoCache.get(fullName);
  }

  const results = [];
  for (const label of labels) {
    const search = await github.searchIssues(`label:"${label}" is:issue is:open archived:false`, perLabel);
    for (const issue of search?.items ?? []) {
      const fullName = issue.repository_url.replace("https://api.github.com/repos/", "");
      const { repo, ban } = await repoFacts(fullName);
      const linkedPrs = openLinkedPrs(await github.timeline(fullName, issue.number));
      results.push({
        label,
        own: label === OWN_LABEL,
        url: issue.html_url,
        title: issue.title,
        repo: fullName,
        stars: repo?.stargazers_count ?? null,
        updated: issue.updated_at,
        skip: skipReason({ issue, repo, ban, linkedPrs }),
      });
    }
  }
  return results;
}

export function formatFind(results) {
  const lines = [];
  const groups = [
    ["Invited with spare-quota-welcome", results.filter((r) => r.own)],
    [`Other labels (${OTHER_LABELS.join(", ")}): meaning varies, check each issue`, results.filter((r) => !r.own)],
  ];
  for (const [heading, group] of groups) {
    lines.push(`## ${heading}`);
    if (group.length === 0) {
      lines.push("", "None found.", "");
      continue;
    }
    const offered = group.filter((r) => !r.skip);
    const skipped = group.filter((r) => r.skip);
    lines.push("", `Would offer (${offered.length}):`);
    for (const r of offered) lines.push(`- ${r.url} [${r.label}, ${r.stars ?? "?"}★] ${r.title}`);
    lines.push("", `Skipped (${skipped.length}):`);
    for (const r of skipped) lines.push(`- ${r.url} [${r.label}]: ${r.skip}`);
    lines.push("");
  }
  return lines.join("\n");
}
