# Competitor ServiceNow MCP Servers — Index

Tracks every third-party ServiceNow MCP server evaluated against this project: what it covers, what's missing here that isn't there, what got ported, and what's still open.

**For Claude, reading this cold in a future session:**
1. Scan the **Quick-search table** below first — it's a self-contained summary (status, dates, vector tags). You often don't need to open a note file at all just to answer "has X been evaluated" or "did we cover Y area."
2. Only open an individual note under `docs/competitors/<owner>-<repo>.md` when you need the full diff/rationale, or before starting a new evaluation of that repo (don't re-diff an already-listed repo unless the user asks for a refresh, or the repo has clearly moved on — new commits, version bump — since `last_synced`).
3. Every note uses the exact same section order (see **Entry schema** below) and YAML frontmatter with the exact same field order — scan by field name rather than reading prose top to bottom.
4. `Gaps found` = missing tool coverage worth possibly porting. `Design ideas noted` = architectural/protocol concepts worth remembering even when nothing was ported — check this field (or the `idea/` vector tags below) before re-proposing an idea from scratch (e.g. don't re-discover "tool packages" as a new insight; it's already evaluated in [echelon-ai-labs](echelon-ai-labs-servicenow-mcp.md)).
5. `status` uses exactly one of: `Merged` · `Partially merged` · `Not merged` · `Pending decision`. Keep this index table's Status column in sync with each note's frontmatter `status` field.

---

## Folder structure

```
docs/
└── competitors/
    ├── README.md                              ← this file: the index/db + workflow instructions
    ├── _template.md                           ← copy this to start a new entry
    ├── <owner>-<repo>.md                      ← one note per competitor server
    └── ...
```

File naming: `<owner-lowercase>-<repo-lowercase>.md`, hyphens only — keeps filenames grep/glob-friendly and matches the `source` URL 1:1.

---

## Quick-search index

The `Vector` column is a dense, greppable tag line per entry — a human-readable stand-in for a search vector. Grep this table for a tag (e.g. `grep 'area/catalog' docs/competitors/README.md`) to shortlist candidates before opening any note file.

| Repo | Status | First discovered | Last synced | Lang | Note | Vector |
|---|---|---|---|---|---|---|
| michaelbuckner/servicenow-mcp | Not merged | 2026-08-19 | 2026-08-19 | Python | [note](michaelbuckner-servicenow-mcp.md) | `status/not-merged lang/python scope/incident-demo area/incident area/table area/knowledge area/user gaps/0 idea/nlp-to-query` |
| kylburns89/servicenow-mcp-server | Merged | 2026-08-19 | 2026-08-19 | TypeScript | [note](kylburns89-servicenow-mcp-server.md) | `status/merged lang/typescript stars/0 area/incident area/change area/cmdb area/catalog area/knowledge area/user area/table area/bulk area/attachment area/atf area/cicd gap/attachment-upload gap/atf-single-run merged/sn_attachment_create merged/sn_atf_test_run` |
| echelon-ai-labs/servicenow-mcp | Merged | 2026-08-19 | 2026-08-19 | Python | [note](echelon-ai-labs-servicenow-mcp.md) | `status/merged lang/python stars/292 area/incident area/catalog area/change area/workflow area/script-include area/update-set area/knowledge area/user area/group area/agile gap/user-group-writes gap/catalog-admin-writes gap/agile-module merged/user-group-writes merged/catalog-admin-writes merged/agile-module idea/tool-packages-declined` |
| jschuller/mcp-server-servicenow | Pending decision | 2026-08-20 | 2026-08-20 | Python | [note](jschuller-mcp-server-servicenow.md) | `status/pending lang/python framework/fastmcp4 stars/16 area/table area/cmdb area/system area/update-set gap/pkce gap/mcp-resources idea/oauth-pkce idea/mcp-resources-primitive idea/claude-code-plugin-distribution idea/stateless-protocol` |
| Parsiphal9/servicenow-mcp | Not merged | 2026-08-20 | 2026-08-20 | TypeScript | [note](parsiphal9-servicenow-mcp.md) | `status/not-merged lang/typescript stars/0 scope/toy area/table-crud gaps/0 idea/0` |
| ShunyaAI/snow-mcp | Merged | 2026-08-20 | 2026-08-20 | Python | [note](shunyaai-snow-mcp.md) | `status/merged lang/python framework/fastmcp stars/6 pypi/snow-mcp area/incident area/table area/catalog area/change area/agile area/project area/workflow area/script-include area/changeset area/knowledge area/user area/group area/ui-policy area/request area/analytics gap/workflow-delete gap/kb-create gap/incident-by-number merged/sn_workflow_delete merged/sn_knowledge_base_create merged/incident-by-number merged/429-retry-backoff idea/per-call-credentials-declined` |
| LokiMCPUniverse/servicenow-mcp-server | Not merged | 2026-08-20 | 2026-08-20 | Python | [note](lokimcpuniverse-servicenow-mcp-server.md) | `status/not-merged lang/python sdk/raw-mcp stars/3 area/table area/incident area/change area/cmdb area/user area/knowledge area/catalog gaps/0 idea/feature-flag-tool-groups-declined idea/429-backoff-already-covered idea/per-call-client-declined` |
| pavecer/mcp-server-servicenow | Not merged | 2026-08-20 | 2026-08-20 | TypeScript | [note](pavecer-mcp-server-servicenow.md) | `status/not-merged lang/typescript stars/1 scope/catalog-ordering-only area/catalog area/request gaps/0 idea/entra-obo-auth idea/dynamic-oauth-registration idea/adaptive-cards idea/azure-functions-hosting` |
| Habenani-p/servicenow-mcp | Partially merged | 2026-08-20 | 2026-08-20 | TypeScript | [note](habenani-p-servicenow-mcp.md) | `status/partially-merged lang/typescript stars/354 license/elastic-2.0 commercial-product npm/nowaikit tool-count/492-largest-found area/ui-builder area/decision-table area/flow-execution area/sys-property area/ml area/virtual-agent gap/ui-builder gap/decision-table gap/flow-trigger gap/sys-property-delete gap/ml-va-unverified merged/sn_ux_experience_list merged/sn_decision_table merged/sn_flow_run merged/sn_sys_property_delete idea/mcp-prompts-primitive-high-value idea/a2a-protocol idea/dynamic-per-table-tools idea/call-time-gating idea/byok-execution-engine` |

**Queue — surfaced but not yet diffed:** none — the initial landscape search queue is fully diffed. New sources are added via the workflow below.

### Vector tag legend

| Prefix | Meaning |
|---|---|
| `status/` | mirrors the frontmatter `status` field |
| `lang/` | primary implementation language |
| `stars/` | GitHub star count at last sync |
| `framework/`, `sdk/` | MCP framework/SDK used (FastMCP, raw `mcp` SDK, `@modelcontextprotocol/sdk`, ...) |
| `area/` | ServiceNow domain area covered (`incident`, `catalog`, `cmdb`, `ui-builder`, ...) — grep this to find "who else covers X" |
| `scope/` | repo's self-described narrow purpose, when not a general-purpose competitor (`toy`, `incident-demo`, `catalog-ordering-only`) |
| `gap/` | a specific missing-coverage item found in that repo (short slug); `gaps/0` = none found |
| `merged/` | a specific tool/fix that was ported into this server as a result of the diff |
| `idea/` | a design/architecture idea worth remembering, with `-declined`/`-high-value`/etc. suffix marking its disposition |
| `license/` | called out only when non-MIT (this server is MIT; most competitors are too — an outlier like `license/elastic-2.0` is worth flagging) |

---

## Entry schema

Every note is one file, fixed frontmatter field order, fixed section order:

**Frontmatter:**
- `source` — repo URL (required, always the entry point for re-fetching)
- `owner`, `repo` — parsed out of the URL, for filename/lookup convenience
- `first_discovered` — date this repo was first surfaced and evaluated (YYYY-MM-DD). **Never changes** after initial creation.
- `last_synced` — date of the most recent diff/re-evaluation (YYYY-MM-DD). Updated every sync run, even if nothing changed.
- `status` — one of `Merged` · `Partially merged` · `Not merged` · `Pending decision`
- `language` — primary implementation language
- `stars_at_last_sync`, `license` — snapshot at last sync, not live-tracked
- `tool_count_theirs_at_last_sync`, `tool_count_ours_at_last_sync` — both sides' counts as of the last sync, so a later diff doesn't need git archaeology to know the baseline
- `vector` — the dense tag line, kept in sync with the Quick-search table row above

**Body sections**, in order:
1. **Summary** — 1-3 sentences: what it covers, how it compares
2. **Gaps found** — numbered list of missing tool coverage worth considering, or `None`
3. **Design ideas noted** — architectural/protocol ideas worth remembering (ported or not), or `None`
4. **Decision & action** — what was ported (tool names + files touched + version bump), why not, or what's still open
5. **Sync history** — table, one row per sync run: date, tool counts at that point, what happened. This is the running functional-diff log — never overwritten, only appended to.

---

## Workflow: adding a new competitor source

1. Copy [`_template.md`](_template.md) to `docs/competitors/<owner>-<repo>.md`.
2. Fill in frontmatter: `source`/`owner`/`repo`, set both `first_discovered` and `last_synced` to today's date, `status: Pending decision` until an actual decision is made.
3. Do the initial evaluation: clone/read the repo, count tools, compare domain-by-domain against `src/tools/registry.ts` (grep this codebase before claiming something is a gap — check the generic `sn_table_*`/`sn_aggregate`/`sn_rest_api_*` layer first, since that alone closes most naive "gaps").
4. Fill in Summary / Gaps found / Design ideas noted / Decision & action, and add the first row to Sync history.
5. Add a row to the **Quick-search index** table above (keep column order and the `Vector` tag conventions identical to existing rows) and update the **Queue** line if it was pulled from there.

## Workflow: scheduled update / re-sync run

Run this per tracked repo (or triggered ad hoc when the user asks for a refresh):

1. Re-fetch the source repo at `source`; note its current commit/tag/version and star count.
2. **Functional diff**: re-count their tools, diff the tool/table list against what's recorded in `tool_count_theirs_at_last_sync` and the last **Gaps found** list — did they add/remove/rename anything since `last_synced`? Did any previously-open gap here get closed on this server independently (check `merged/` tags and this server's own `CLAUDE.md` version history)?
3. **Gap analysis**: re-run the domain-by-domain comparison against this server's current `src/tools/registry.ts` (tool counts drift on both sides between syncs — re-baseline, don't assume last sync's counts still hold). Close out any gap that's no longer a gap (either they removed the feature, or this server gained equivalent coverage via an unrelated module pass); add any newly-found gap.
4. Update the note:
   - Bump `last_synced` to today; update `stars_at_last_sync`, `tool_count_theirs_at_last_sync`, `tool_count_ours_at_last_sync`.
   - Update `status` if it changed (e.g. `Pending decision` → `Merged`/`Not merged`/`Partially merged`).
   - Append a new row to **Sync history** — never edit or delete a prior row, this table is the audit trail.
   - Update **Gaps found** / **Design ideas noted** / **Decision & action** in place to reflect current reality (these sections describe current state, not a log — that's what Sync history is for).
   - Update the `vector` tag line so `gap/`/`merged/`/`idea/` tags match what's now current.
5. Update this file's Quick-search index row (Status, Last synced, Vector) to match the note.
6. If a tool gets ported as part of the sync, follow this server's normal contribution pattern: add to the right `src/tools/<domain>/*.ts` file, register in `src/tools/registry.ts` if it's a new module, bump the version in `package.json`, and update the tool/module counts in `CLAUDE.md`.

To automate the recurring cadence itself (e.g. a weekly check across all tracked repos), use the `schedule` skill to create a cloud routine that walks this table and runs the steps above per entry — ask if that's wanted rather than assuming a cadence.
