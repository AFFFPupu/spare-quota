import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCodexLine, readCodex } from "../src/codex.mjs";
import { claudeSnapshot, readClaude, saveClaude } from "../src/claude.mjs";
import { formatLine } from "../src/format.mjs";

const NOW = 1793000000;

const codexLine = JSON.stringify({
  timestamp: new Date(NOW * 1000).toISOString(),
  type: "event_msg",
  payload: {
    type: "token_count",
    rate_limits: {
      primary: { used_percent: 3.0, window_minutes: 10080, resets_at: NOW + 86400 },
      secondary: null,
    },
  },
});

test("parses a Codex token_count line", () => {
  assert.deepEqual(parseCodexLine(codexLine), {
    source: "Codex",
    observedAt: NOW,
    windows: [{ name: "week", usedPercent: 3, resetsAt: NOW + 86400 }],
  });
  assert.equal(parseCodexLine('{"type":"other"}'), null);
});

test("reads the newest Codex snapshot from nested session folders", () => {
  const dir = mkdtempSync(join(tmpdir(), "codex-"));
  mkdirSync(join(dir, "2026", "10", "23"), { recursive: true });
  writeFileSync(join(dir, "2026", "10", "23", "rollout-a.jsonl"), `${codexLine}\n{"type":"x"}\n`);
  assert.equal(readCodex(dir).windows[0].usedPercent, 3);
  assert.equal(readCodex(join(dir, "missing")), null);
});

test("round-trips Claude rate limits through the cache", () => {
  const path = join(mkdtempSync(join(tmpdir(), "claude-")), "claude.json");
  const rateLimits = {
    five_hour: { used_percentage: 23.5, resets_at: NOW + 3600 },
    seven_day: { used_percentage: 41.2, resets_at: NOW + 3 * 86400 },
  };
  assert.equal(saveClaude({}, NOW, path), false);
  assert.equal(saveClaude({ rate_limits: rateLimits }, NOW, path), true);
  assert.deepEqual(readClaude(path), claudeSnapshot(rateLimits, NOW));
});

test("formats one line, marking stale and reset windows", () => {
  const claude = claudeSnapshot({ five_hour: { used_percentage: 23.5, resets_at: NOW - 1 } }, NOW);
  const codex = parseCodexLine(codexLine);
  const line = formatLine({ claude, codex: { ...codex, observedAt: NOW - 7200 } }, NOW);
  assert.match(line, /^Claude 5h reset since last seen \| Codex week 3% \(resets \w{3} \d\d:\d\d\), seen 2h ago$/);
  assert.equal(formatLine({ claude: null, codex: null }, NOW), "Claude no data | Codex no data");
});
