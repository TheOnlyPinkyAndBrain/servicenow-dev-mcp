---
source: https://github.com/shunyaai/snow-mcp
owner: ShunyaAI
repo: snow-mcp
first_discovered: 2026-08-20
last_synced: 2026-08-20
status: Merged
language: Python
stars_at_last_sync: 6
license: unknown
pypi: snow-mcp
tool_count_theirs_at_last_sync: 88 tools / 14 modules
tool_count_ours_at_last_sync: 406 tools / 55 modules (before) -> 409 tools (after)
vector: status/merged lang/python framework/fastmcp stars/6 pypi/snow-mcp area/incident area/table area/catalog area/change area/agile area/project area/workflow area/script-include area/changeset area/knowledge area/user area/group area/ui-policy area/request area/analytics gap/workflow-delete gap/kb-create gap/incident-by-number merged/sn_workflow_delete merged/sn_knowledge_base_create merged/incident-by-number merged/429-retry-backoff idea/per-call-credentials-declined
---

# ShunyaAI/snow-mcp

## Summary

Broad, well-organized coverage — incident, table, catalog, change, agile (story/epic/scrum), project, workflow, script include, changeset, knowledge base, user/group, UI policy, request, analytics. Domain-per-folder structure close to this server's own module layout. Nearly every category is already matched or exceeded here — including the Agile Development and user/group-write areas this server closed in the [echelon-ai-labs](echelon-ai-labs-servicenow-mcp.md) merge (2026-08-20), which map almost field-for-field onto this repo's `agile_management`/`user_management` modules (good independent confirmation those merges were the right call).

## Gaps found

1. `delete_workflow` — this server has no `sn_workflow_delete`; only create/update/list/get/versions/activities/context/execution_history exist for `wf_workflow`.
2. `create_knowledge_base` / `create_category` (KB) — this server's `sn_knowledge_*` tools are missing a create for the KB container (`kb_knowledge_base`) and its categories. Same gap already flagged in the [echelon-ai-labs](echelon-ai-labs-servicenow-mcp.md) entry and still open at the time — two independent repos now suggest this is a real, recurring hole.
3. `get_incident_by_number` — this server's `sn_incident_get` only accepts `sys_id`, not the human-readable incident number (e.g. `INC0010023`) shown in the UI/emails/tickets. Minor UX gap: callers who only have the number must first `sn_incident_list` with a number filter to resolve the sys_id.

## Design ideas noted

- Per-call credentials — every tool's Pydantic params model includes `instance_url`/`username`/`password` directly, rather than a server-configured connection. Genuinely stateless/multi-tenant-friendly (one running process can serve many ServiceNow instances/customers without restart), but conflicts with this server's env-var + elicitation instance model — not adopted, since this server already solves the "multiple instances" problem differently (`SERVICENOW_INSTANCES`, `sn_instance_switch`) and per-call credentials would mean re-sending secrets on every tool call instead of once at connection time.
- Built-in retry-with-exponential-backoff for ServiceNow rate-limit (429) responses. Verified this server's `client.ts` only retried once, and only on 401 (auth expiry) — no 429/backoff handling existed. Adopted (see Decision & action below) — a real operational robustness gap, orthogonal to tool coverage but worth closing alongside it.
- Self-documenting CLI (`--list-tools` style) to enumerate available tools from the terminal. Nice-to-have; largely redundant here since MCP clients already provide tool introspection.

## Decision & action

Merged 2026-08-20 — all three tool-coverage gaps plus the 429/backoff robustness item closed in one pass:
- `sn_workflow_delete` — added to [workflow.ts](../../src/tools/application-development/workflow.ts), matching the existing CRUD pattern for `wf_workflow`.
- `sn_knowledge_base_create` / `sn_knowledge_category_create` — added to [knowledge.ts](../../src/tools/servicenow-platform/knowledge.ts) for `kb_knowledge_base`/`kb_category`.
- Incident-by-number lookup — not a new tool; extended the existing `sn_incident_get` in [incident.ts](../../src/tools/it-service-management/incident.ts) to accept an optional `number` alongside `sys_id` (resolves the number to a sys_id via a lookup query first, then runs the existing detail-fetch logic). Kept as one tool rather than a separate `sn_incident_get_by_number` to avoid duplicating the related-records fetch logic.
- 429 retry-with-backoff — added to the shared `request()` method in [client.ts](../../src/client.ts): honors `Retry-After` (seconds or HTTP-date) when ServiceNow sends it, otherwise exponential backoff (500ms base, doubling, capped at 8s), up to 3 retries. Scoped to `request()` only (covers `query`/`getById`/`create`/`update`/`delete`/`restApi`/`aggregate`/`batchRequest`) — deliberately not extended to `attachmentUpload`'s raw binary POST or the background-script session's form-POST calls, since those are lower-frequency, differently-shaped requests and extending backoff there would be scope creep beyond what a rate-limit fix needs.
- Version bumped 3.16.0 → 3.17.0; tool count 406 → 409 (verified by direct `server.tool(` registration count).

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| 2026-08-20 | 88 / 406 → 409 | Merged: `sn_workflow_delete`, `sn_knowledge_base_create`, `sn_knowledge_category_create`, incident-by-number lookup, 429 retry-backoff |
