#!/usr/bin/env node
// Prints Claude Code and Codex quota on one line. `--json` prints the snapshots.
import { readClaude } from "../src/claude.mjs";
import { readCodex } from "../src/codex.mjs";
import { formatLine } from "../src/format.mjs";

const snapshots = { claude: readClaude(), codex: readCodex() };

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(snapshots, null, 2));
} else {
  console.log(formatLine(snapshots));
}
