// Reads Codex's latest rate-limit snapshot from its local session logs.
// Each rollout file (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl) records
// `rate_limits` on token_count events, so the newest one is the freshest view.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const CODEX_SESSIONS = join(homedir(), ".codex", "sessions");

export function windowName(minutes) {
  if (minutes === 300) return "5h";
  if (minutes === 10080) return "week";
  return minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`;
}

// Turns one rollout line into a snapshot, or null if it has no rate limits.
export function parseCodexLine(line) {
  if (!line.includes('"rate_limits"')) return null;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return null;
  }
  const limits = event.payload?.rate_limits;
  if (!limits) return null;
  const windows = [limits.primary, limits.secondary]
    .filter(Boolean)
    .map((w) => ({
      name: windowName(w.window_minutes),
      usedPercent: w.used_percent,
      resetsAt: w.resets_at,
    }));
  return {
    source: "Codex",
    observedAt: Date.parse(event.timestamp) / 1000,
    windows,
  };
}

function rolloutFiles(dir) {
  let names;
  try {
    names = readdirSync(dir, { recursive: true });
  } catch {
    return [];
  }
  return names
    .filter((n) => n.endsWith(".jsonl"))
    .map((n) => join(dir, n))
    .map((path) => ({ path, mtime: statSync(path).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((f) => f.path);
}

export function readCodex(dir = CODEX_SESSIONS, maxFiles = 20) {
  for (const path of rolloutFiles(dir).slice(0, maxFiles)) {
    const lines = readFileSync(path, "utf8").split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const snapshot = parseCodexLine(lines[i]);
      if (snapshot) return snapshot;
    }
  }
  return null;
}
