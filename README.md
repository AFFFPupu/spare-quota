# spare-quota

See how much of your Claude Code and Codex quota will go unused before it resets.

```
$ spare-quota
Claude 5h 24% (resets 15:51) · week 41% (resets Tue 00:41) | Codex week 3% (resets Thu 20:46)
```

Early work in progress. The plan is to offer leftover weekly quota to
open-source issues you pick, in your own fork, with every PR reviewed and
opened by you.

## Where the numbers come from

- **Codex**: the newest `rate_limits` entry in `~/.codex/sessions/**/rollout-*.jsonl`.
  It updates only while a Codex session runs.
- **Claude Code**: Claude Code gives plan usage to the status line, so
  `spare-quota-statusline` saves each `rate_limits` it receives to
  `~/.cache/spare-quota/claude.json` and prints the same line. Pro and Max only,
  after the session's first response. Add it in `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/spare-quota/bin/statusline.mjs"
  }
}
```

`spare-quota --json` prints the raw snapshots. Tests: `npm test`.

## License

Apache-2.0
