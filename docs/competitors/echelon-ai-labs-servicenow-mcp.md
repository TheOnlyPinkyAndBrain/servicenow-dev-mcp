---
source: https://github.com/echelon-ai-labs/servicenow-mcp
owner: echelon-ai-labs
repo: servicenow-mcp
first_discovered: 2026-08-19
last_synced: 2026-08-19
status: Merged
language: Python
stars_at_last_sync: 292
license: unknown
tool_count_theirs_at_last_sync: 82 tools / 15 files
tool_count_ours_at_last_sync: 378 tools / 54 modules (before) -> 406 tools / 55 modules (after)
vector: status/merged lang/python stars/292 area/incident area/catalog area/change area/workflow area/script-include area/update-set area/knowledge area/user area/group area/agile gap/user-group-writes gap/catalog-admin-writes gap/agile-module merged/user-group-writes merged/catalog-admin-writes merged/agile-module idea/tool-packages-declined
---

# echelon-ai-labs/servicenow-mcp

## Summary

Broad ITSM-adjacent coverage — incident, catalog, change, legacy workflow, changesets/update-sets, script includes, knowledge, users & groups, plus a full Agile Development module (stories/epics/scrum-tasks/projects). 292 stars — the most established repo surveyed in the initial landscape pass.

## Gaps found

1. User/Group write operations — this server had list-only user/group tools; no create/update for `sys_user`/`sys_user_group`, no group-membership add/remove.
2. Catalog admin writes — category create/update, catalog-item-variable create/update, catalog-item update were all missing (read-only catalog admin coverage only).
3. Agile Development / SDLC module (`rm_story`, `rm_epic`, `rm_scrum_task`, `pm_project`) — zero coverage, a whole product area absent from all 15 folders.

## Design ideas noted

Role-based **"tool packages"** (`service_desk`, `catalog_builder`, `change_coordinator`, `platform_developer`, `agile_management`, `full`, `none`, ...) selected via `MCP_TOOL_PACKAGE` env var, gating *which* tools are visible — orthogonal to this server's `debug`/`develop` read/write gate. Discussed at length 2026-08-20; **not adopted for now**. Pros: much smaller tool surface per deployment, role-shaped multi-agent setups, better tool-selection accuracy at high tool counts. Cons: not a real security boundary on its own (the generic `sn_table_*` layer still reaches everything unless also gated, undercutting this server's core "anything is reachable" coverage promise), ongoing maintenance surface (every new tool needs a package assignment, contract test would need extending to check it), config/mental-model sprawl (a second orthogonal gate on top of `debug`/`develop`). **Revisit if/when the tool count or a multi-agent deployment need makes tool-selection accuracy a real problem.**

## Decision & action

Merged 2026-08-20.
- User/Group writes: `sn_user_create/update`, `sn_group_create/update`, `sn_group_member_add/remove` — added to [security.ts](../../src/tools/platform-security/security.ts).
- Catalog admin writes: `sn_catalog_category_create/update`, `sn_catalog_item_update`, `sn_catalog_item_variable_create/update` — added to [catalog.ts](../../src/tools/it-service-management/catalog.ts).
- Agile Development module: new file [agile.ts](../../src/tools/application-development/agile.ts) (15 tools — stories, story dependencies, epics, scrum tasks, projects), registered as a new module in [registry.ts](../../src/tools/registry.ts).
- Version bumped 3.15.0 → 3.16.0. Tool/module counts verified by direct `server.tool(` registration count per module (not just incrementing stale README numbers) — this also caught and fixed a pre-existing doc gap unrelated to this merge: `sn_workflow_create`/`sn_workflow_update` existed in code but were undocumented.

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| 2026-08-19 | 82 / 378 | Evaluated, gaps identified |
| 2026-08-20 | 82 / 406 | Merged: user/group writes, catalog admin writes, agile module (15 tools) |
