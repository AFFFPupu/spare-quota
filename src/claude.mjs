// Claude Code only hands plan usage to the status line (and to mods), so the
// status line script saves each `rate_limits` it receives to a cache file and
// the CLI reads that file.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const CLAUDE_CACHE = join(homedir(), ".cache", "spare-quota", "claude.json");

const WINDOW_NAMES = { five_hour: "5h", seven_day: "week" };

// `rateLimits` is the status line's `rate_limits` object.
export function claudeSnapshot(rateLimits, observedAt) {
  const windows = Object.entries(WINDOW_NAMES)
    .filter(([key]) => rateLimits?.[key])
    .map(([key, name]) => ({
      name,
      usedPercent: rateLimits[key].used_percentage,
      resetsAt: rateLimits[key].resets_at,
    }));
  return { source: "Claude", observedAt, windows };
}

// Called with the status line's JSON input. Absent before the session's first
// API response and for non-subscription logins, in which case the old cache stays.
export function saveClaude(input, now = Date.now() / 1000, path = CLAUDE_CACHE) {
  if (!input?.rate_limits) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ observedAt: now, rate_limits: input.rate_limits }));
  return true;
}

export function readClaude(path = CLAUDE_CACHE) {
  let cached;
  try {
    cached = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
  return claudeSnapshot(cached.rate_limits, cached.observedAt);
}
