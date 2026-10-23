#!/usr/bin/env node
// Claude Code status line command: saves `rate_limits` from stdin for the CLI,
// then prints the same one-line summary as `spare-quota`.
import { readFileSync } from "node:fs";
import { readClaude, saveClaude } from "../src/claude.mjs";
import { readCodex } from "../src/codex.mjs";
import { formatLine } from "../src/format.mjs";

let input = null;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // No or bad input: still print what the caches hold.
}
saveClaude(input);
console.log(formatLine({ claude: readClaude(), codex: readCodex() }));
