---
source: https://github.com/LokiMCPUniverse/servicenow-mcp-server
owner: LokiMCPUniverse
repo: servicenow-mcp-server
first_discovered: 2026-08-20
last_synced: 2026-08-20
status: Not merged
language: Python
stars_at_last_sync: 3
license: unknown
tool_count_theirs_at_last_sync: 15 tools
tool_count_ours_at_last_sync: 409 tools / 55 modules
vector: status/not-merged lang/python sdk/raw-mcp stars/3 area/table area/incident area/change area/cmdb area/user area/knowledge area/catalog gaps/0 idea/feature-flag-tool-groups-declined idea/429-backoff-already-covered idea/per-call-client-declined
---

# LokiMCPUniverse/servicenow-mcp-server

## Summary

Small, generic-table-first design — `query_table`/`get_record`/`create_record`/`update_record`/`delete_record` plus a thin layer of specialized tools: incident (create/update/search), change (create only), CMDB (search + relationships), user search, KB search, catalog item listing, and generic aggregate stats. Uses the raw official `mcp` SDK (not FastMCP), `httpx`, pydantic v2, click CLI. Feature-flag config (`FeaturesConfig` booleans like `incident_management`, `change_management`, `cmdb`, `custom_tables`) gates which tool groups are advertised — note a `problem_management` flag exists in config with zero corresponding tools actually registered, an internal inconsistency in their own repo. Single hardcoded ServiceNow instance, basic auth only, no OAuth/bearer despite README suggesting OAuth "for production." Every category here is a strict subset of this server's equivalents. Their own README's tool list is stale/inflated (lists a `change_search` tool that doesn't actually exist in code — verified against `src/servicenow_mcp/tools.py`'s `ToolRegistry._register_all_tools()`).

## Gaps found

None. Nothing exceeds what this server's generic + ergonomic layers already provide.

## Design ideas noted

- Feature-flag-gated tool groups (config booleans prefix-matched against tool names at list-time) — a coarser, config-file-driven cousin of the "tool packages" idea already evaluated (and declined for now) in the [echelon-ai-labs](echelon-ai-labs-servicenow-mcp.md) entry. Not adopted for the same reasons.
- 429 rate-limit handling via exponential backoff (`2**retry_count` seconds, capped retries) — this server already closed an equivalent gap in the [ShunyaAI/snow-mcp](shunyaai-snow-mcp.md) merge, so no new action needed here.
- Per-call fresh client context (`async with self.client:` opened new on every tool call, no persistent connection) — a lighter-weight variant of the "per-call credentials" idea already evaluated and declined in the [jschuller](jschuller-mcp-server-servicenow.md) and [ShunyaAI](shunyaai-snow-mcp.md) entries. Not adopted, same reasoning (this server already solves multi-instance differently).

## Decision & action

No action. Nothing to port; every design idea present here was already evaluated (and declined, or already addressed) via an earlier, more fully-realized version of the same idea in a prior entry.

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| 2026-08-20 | 15 / 409 | Evaluated — no action |
