// Formats snapshots as one line, e.g.
// "Claude 5h 23% (resets 18:00) · week 41% (resets Thu 09:00) | Codex week 3% (resets Thu 20:46, seen 3h ago)"

function resetTime(epochSeconds, now) {
  const at = new Date(epochSeconds * 1000);
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const sameDay = at.toDateString() === new Date(now * 1000).toDateString();
  if (sameDay) return time;
  return `${at.toLocaleDateString("en-GB", { weekday: "short" })} ${time}`;
}

function age(seconds) {
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

export function formatWindow(w, now) {
  // A snapshot taken before a reset says nothing about the new window.
  if (w.resetsAt <= now) return `${w.name} reset since last seen`;
  return `${w.name} ${Math.round(w.usedPercent)}% (resets ${resetTime(w.resetsAt, now)})`;
}

export function formatSnapshot(snapshot, name, now) {
  if (!snapshot) return `${name} no data`;
  if (snapshot.windows.length === 0) return `${name} no limits reported`;
  const windows = snapshot.windows.map((w) => formatWindow(w, now)).join(" · ");
  const seen = now - snapshot.observedAt;
  // Older than ten minutes: say so, since both sources only update while a session runs.
  return seen > 600 ? `${name} ${windows}, seen ${age(seen)}` : `${name} ${windows}`;
}

export function formatLine({ claude, codex }, now = Date.now() / 1000) {
  return [formatSnapshot(claude, "Claude", now), formatSnapshot(codex, "Codex", now)].join(" | ");
}
