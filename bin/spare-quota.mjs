#!/usr/bin/env node
// `spare-quota` prints Claude Code and Codex quota on one line.
// `spare-quota find` lists open issues whose maintainers invited help.
// `--json` prints raw data for either.
import { readClaude } from "../src/claude.mjs";
import { readCodex } from "../src/codex.mjs";
import { findIssues, formatFind } from "../src/find.mjs";
import { formatLine } from "../src/format.mjs";
import { githubClient } from "../src/github.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");

if (args[0] === "find") {
  const results = await findIssues(githubClient());
  console.log(json ? JSON.stringify(results, null, 2) : formatFind(results));
} else {
  const snapshots = { claude: readClaude(), codex: readCodex() };
  console.log(json ? JSON.stringify(snapshots, null, 2) : formatLine(snapshots));
}
