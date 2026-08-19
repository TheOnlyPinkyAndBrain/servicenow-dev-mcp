---
source: https://github.com/Habenani-p/servicenow-mcp
owner: Habenani-p
repo: servicenow-mcp
first_discovered: 2026-08-20
last_synced: 2026-08-20
status: Partially merged
language: TypeScript
stars_at_last_sync: 354
license: Elastic License 2.0 (source-available, not OSI-open)
npm: nowaikit (v4.12.1 at eval time, 28 releases since 2025-02-12)
tool_count_theirs_at_last_sync: 492 tools (491 static + 1 meta `search_tools`)
tool_count_ours_at_last_sync: 409 tools / 55 modules (before) -> 418 tools / 58 modules (after partial merge)
vector: status/partially-merged lang/typescript stars/354 license/elastic-2.0 commercial-product npm/nowaikit tool-count/492-largest-found area/ui-builder area/decision-table area/flow-execution area/sys-property area/ml area/virtual-agent gap/ui-builder gap/decision-table gap/flow-trigger gap/sys-property-delete gap/ml-va-unverified merged/sn_ux_experience_list merged/sn_decision_table merged/sn_flow_run merged/sn_sys_property_delete idea/mcp-prompts-primitive-high-value idea/a2a-protocol idea/dynamic-per-table-tools idea/call-time-gating idea/byok-execution-engine
---

# Habenani-p/servicenow-mcp

## Summary

The broadest competitor found in the initial landscape search — 354 stars, the most-starred repo surveyed across the whole evaluation, and the only repo with a larger raw tool count than this server. Published to npm as `nowaikit`, branded as a commercial product (PDF/PPTX report generation with white-label branding, an Electron desktop app, a multi-client setup wizard) rather than a community open-source project — **License: Elastic License 2.0** (source-available, restricts hosting-as-a-service/reselling, commercial licensing sold separately), unlike every other repo surveyed (all MIT) and unlike this server (also MIT).

Domain modules roughly parallel this server's own folder structure (script/business-rule tools, generic table CRUD, integration/REST-messages/transform-maps, security-incidents/vulnerabilities/GRC, reporting/PA, Flow Designer, HRSD, CSM, agile, catalog, notifications, sys-properties, ITAM, ATF, update-sets, users/groups, change/incident/problem/knowledge/SLA/on-call) and for nearly all of these, side-by-side comparison shows this server's equivalents are comparable or broader in depth (e.g. this server's Performance Analytics coverage — 7 dedicated tools — is broader than their combined `performance.ts`). The genuine size difference comes from a handful of areas this server had zero coverage of (see Gaps found), plus a long tail of niche/low-value modules (local dev-file sync, doc-search-the-internet, visualization/chart rendering, a compatibility "parity shim" layer) that aren't ServiceNow-instance API coverage at all and wouldn't be ported regardless of size.

Tool count verified by building the repo and inspecting the generated `dist/tools-manifest.json`: 491 static domain tools summed independently across 54 tool-definition files, matching exactly, + 1 meta tool `search_tools`; their own README's "450+" claim is actually an understatement, not inflated.

## Gaps found

Verified directly against this codebase's `src/tools/` — confirmed zero coverage in each case via grep, at time of evaluation:

1. **UI Builder / UX Workspace tools** — zero coverage of `sys_ux_*` tables (pages, experiences, app configs) anywhere in this server. Their `workspace.ts` has 16 tools for this. Worth taking seriously: ServiceNow is increasingly pushing UI Builder as the successor UI framework to Service Portal (especially for CSM/HRSD workspaces) — a growing blind spot, not just a missing edge case, as instances modernize onto newer ServiceNow releases. **Closed** — see Decision & action.
2. **Decision Tables** (`sys_decision_table` and related) — zero coverage. Increasingly used inside Flow Designer logic for maintainable business rules without code, comparable in spirit to how this server already covers UI Policies. **Closed** — see Decision & action.
3. **Flow execution/trigger** — this server's `sn_flow_*` tools covered list/get/create/update/list_actions/action_type_list but had no way to manually run/trigger a flow on demand. Their `flow.ts` has `trigger_flow`/`flow_execution`. Same shape of gap already closed once for ATF (list-only → added `sn_atf_test_run` in the [kylburns89](kylburns89-servicenow-mcp-server.md) merge). **Closed** — see Decision & action.
4. **`sys_property` delete** — this server had `sn_sys_property_get/list/set` but no delete counterpart; a small CRUD-symmetry gap. **Closed** — see Decision & action.
5. **Still open / unverified** — their `ml.ts` (12 tools — `ml_predict_change_risk`, `ml_detect_anomalies`, `ml_forecast_incidents`) and Virtual Agent tools (`va.ts`) — this server has zero coverage of either area, but it's unverified whether their ML tools call real ServiceNow Predictive Intelligence/ML Solutions REST APIs (portable, ergonomic-wrapper-worthy) or are a custom heuristic computed client-side over generic query results (not really "ServiceNow API coverage" at all, nothing to port). **Not acted on** — needs implementation verification on their side before deciding.
- Not counted as gaps: their `local-sync` (dev-file sync tooling), `docs` (searches ServiceNow's own product documentation on the web, not the connected instance), and `visualization` (chart/diagram rendering) modules aren't ServiceNow-instance API coverage — they're client-side/tooling features orthogonal to what this server does, and sizing this server against the 492 count without excluding these would be misleading.

## Design ideas noted

The most architecturally interesting repo surveyed in this whole evaluation:

- **MCP Prompts primitive used to package "capabilities"** — 27 structured prompt templates (`scan-health`, `scan-security`, `review-code`, `build-flow`, `ops-triage`, `docs-runbook`, etc., organized as scan-/review-/build-/ops-/docs- prefixes) exposed via `prompts/list`/`prompts/get`, each a multi-thousand-word instruction template referencing a `recommendedTools` list. The one clearly novel, high-value idea here: bundling expert ServiceNow-domain workflows as invocable prompts (a first-class MCP primitive this server doesn't use at all — confirmed via `grep -rl "server.resource\|registerResource" src/` returning nothing, and the same is true for `server.prompt`/`registerPrompt`) rather than leaving the calling LLM to construct multi-step ServiceNow workflows ad hoc from raw tool descriptions. **Worth serious consideration as a future direction** — distinct axis from tool coverage entirely, and orthogonal to (compatible with) everything else this server already does. Not implemented as part of the partial merge below — tracked as still-open.
- **A2A (Agent2Agent) protocol support** — serves a Google A2A Agent Card (`GET /.well-known/agent.json`, tools grouped into ~20 "skills") plus task endpoints (`/a2a/tasks/send`, streaming, cancel), letting non-MCP agent frameworks invoke the same tool set via a different protocol, mounted only under HTTP/SSE transport. This server is MCP-only; a genuinely different protocol-breadth idea, not something to casually bolt on (real implementation cost, a whole second protocol surface to maintain), but worth knowing this precedent exists.
- **Dynamic per-table tool generation** (`discover_table` + runtime-generated `dynamic_query_<table>`/`dynamic_get_<table>`/etc., cached 30 min per instance) — appends new tools to the list after discovering an unfamiliar table's schema. Interesting but two-edged: this server's generic `sn_table_query`/`create`/`update`/`delete` already reach any table without needing per-table tool generation at all, and a growing/mutating tool list at runtime risks confusing MCP client-side tool caching. Not obviously worth the complexity given this server's generic layer already solves the same underlying problem.
- **Call-time (not registration-time) mode gating** — every tool (including writes) is always present in the tool list; write/CMDB-write/scripting/etc. each check a separate env flag inside the handler and throw at call time if disabled, rather than omitting the tool from `getTools()`. Deliberate tradeoff opposite to this server's registration-time gating (`if (mode !== "develop") return;`). Combined with 12 predefined "tool packages" (`MCP_TOOL_PACKAGE`) and a `DELEGATED_AUTH` mode narrowing tiers per-request from trusted-gateway headers — a more fully-realized version of the "tool packages" idea already discussed and declined (for now) in the [echelon-ai-labs](echelon-ai-labs-servicenow-mcp.md) entry. Still not recommended to adopt wholesale (generic layer still reaches everything regardless of package/tier, so it's UX/context-management, not a real security boundary) — but the call-time-check pattern specifically (as opposed to registration-time hiding) is a smaller, separable idea worth remembering if a future need calls for "visible but conditionally callable" tools.
- **Direct/BYOK execution engine** — capabilities can run entirely outside MCP, gathering ServiceNow data directly and sending one consolidated prompt to a user-supplied LLM (any provider, or a local CLI subscription with no API key), claiming ~83% token savings vs. sending full MCP tool schemas on every call. A competing execution/distribution model, not a portable feature — noted for awareness, not something to build here.
- Elastic License 2.0 and the general shape of the repo (commercial product, branded reports, desktop app, multi-client setup wizard) — context for weighing this as a "competitor" rather than a community project; the 492-tool headline number reflects a well-funded product, not purely organic community coverage growth.

## Decision & action

Partially merged — first pass 2026-08-20, closing the four cheap/verified gaps that follow this server's existing CRUD/list patterns:
- UI Builder / UX Workspace: new file [ui-builder.ts](../../src/tools/platform-user-interface/ui-builder.ts) — `sn_ux_experience_list` + related discovery/inspection tools over `sys_ux_*`. Deliberately **read-only by design**: UI Builder experiences/pages are visually authored (component trees, data resources, client-state) the same way Service Portal widgets are, so scripting a create/update would produce a record with none of the actual page content — matches this server's existing stance on other GUI-authored artifacts (e.g. `sn_workflow_create`'s activity caveat).
- Decision Tables: new file [decision-table.ts](../../src/tools/application-development/decision-table.ts) — `sn_decision_table_list`/get/create/update over `sys_decision`.
- Flow execution: `sn_flow_run` added to [flow.ts](../../src/tools/application-development/flow.ts) — routes through the background-script engine (`sn_fd.FlowAPI.getRunner()`) since Flow Designer has no generic REST endpoint to invoke an arbitrary flow by sys_id (unlike ATF's `/api/now/v1/atf/test/run`); only flows with their own Inbound REST trigger get a dedicated webhook URL.
- `sn_sys_property_delete` — added to [system.ts](../../src/tools/now-platform/system.ts), matching the existing `sys_properties` get/list/set pattern.
- Both new modules registered in [registry.ts](../../src/tools/registry.ts) (`registerUiBuilderTools`, `registerDecisionTableTools`).
- Version bumped 3.17.0 → 3.18.0; tool count 409 → 418 across 58 modules.

**Still open:**
- Gap #5 (ML / Virtual Agent modules) — not acted on, needs implementation verification on their side first.
- The **MCP Prompts primitive** design idea — the single highest-value idea from this evaluation, not yet implemented. Tracked as a standalone future direction, independent of any single competitor sync.

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| 2026-08-20 | 492 / 409 | Evaluated — 5 gaps + design ideas identified |
| 2026-08-20 | 492 / 418 | Partially merged: UI Builder (`ui-builder.ts`), Decision Tables (`decision-table.ts`), `sn_flow_run`, `sn_sys_property_delete`. ML/VA gap and MCP Prompts idea remain open |
