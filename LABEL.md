# The `spare-quota-welcome` label

A maintainer puts this label on an issue to say: people may spend their
leftover Claude Code or Codex quota on this issue and send a pull request,
under the rules below. Removing the label withdraws the invitation.

`spare-quota` only offers issues that carry this label.

## Add it to your repository

```
gh label create spare-quota-welcome --color 0E8A16 \
  --description "Reviewed, disclosed AI-assisted PRs welcome on this issue"
```

Then label the issues you want help with. Clear acceptance criteria in the
issue (what done looks like, how to test it) get better results.

## What contributors promise

1. **A person reviews every change.** The agent works in the contributor's
   own fork; the contributor reads the diff, runs the tests and opens the PR
   themselves. Nothing is opened automatically.
2. **Disclosure.** The PR says it was made with an AI agent and has an
   `Assisted-by: <agent>:<model>` trailer on each commit.
3. **One PR per issue,** linked to the issue. If someone else already has an
   open PR for it, skip it.
4. **The project's own rules come first:** `CONTRIBUTING`, `AI_POLICY.md`,
   `AGENTS.md`, code style, tests and any PR template.
5. **No chasing.** No pings for review; close the PR if the maintainer
   asks.

## Paste into CONTRIBUTING (optional)

```markdown
### Spare AI quota

Issues labelled `spare-quota-welcome` accept AI-assisted pull requests,
following https://github.com/AFFFPupu/spare-quota/blob/main/LABEL.md:
reviewed by a person, disclosed with an `Assisted-by:` trailer, one PR per
issue.
```

## Why a new label

As of 2026-10-23, GitHub already has issues labelled `agent-friendly`
(about 1,700), `ai-friendly` (about 680) and `ai-welcome` (about 350), but
each project uses them to mean something different: "an agent could do
this", "good for AI tooling" or "AI PRs accepted". This label has one
written meaning that a maintainer can point to.
