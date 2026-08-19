---
source: https://github.com/<owner>/<repo>
owner: <owner>
repo: <repo>
first_discovered: YYYY-MM-DD
last_synced: YYYY-MM-DD
status: Pending decision
language: <e.g. Python, TypeScript>
stars_at_last_sync: <n>
license: <e.g. MIT, Elastic-2.0, unknown>
tool_count_theirs_at_last_sync: <n tools / n files>
tool_count_ours_at_last_sync: <n tools / n modules>
vector: status/pending-decision lang/<lang> stars/<n> area/<domain1> area/<domain2> gap/<short-tag> idea/<short-tag>
---

# <owner>/<repo>

## Summary

1-3 sentences: what it covers, how it compares to this server's coverage in the overlapping areas.

## Gaps found

Numbered list of missing tool coverage worth considering, or `None`. For each: tool/table name, what it does, why it's not already covered (checked the generic layer first?).

## Design ideas noted

Architectural/protocol ideas worth remembering, ported or not, or `None`. Link to an earlier entry with `[repo-name](file-name.md)` instead of re-describing an idea already evaluated there.

## Decision & action

What was ported (tool names + files touched + version bump), why not, or what's still open.

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| YYYY-MM-DD | <n> / <n> | Initial evaluation — <outcome> |
