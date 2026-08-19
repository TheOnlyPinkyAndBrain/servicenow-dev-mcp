---
source: https://github.com/jschuller/mcp-server-servicenow
owner: jschuller
repo: mcp-server-servicenow
first_discovered: 2026-08-20
last_synced: 2026-08-20
status: Pending decision
language: Python
stars_at_last_sync: 16
license: unknown
tool_count_theirs_at_last_sync: 19 tools + 5 MCP resources
tool_count_ours_at_last_sync: 406 tools / 55 modules
vector: status/pending lang/python framework/fastmcp4 stars/16 area/table area/cmdb area/system area/update-set gap/pkce gap/mcp-resources idea/oauth-pkce idea/mcp-resources-primitive idea/claude-code-plugin-distribution idea/stateless-protocol
---

# jschuller/mcp-server-servicenow

## Summary

Deliberately minimal and generic-table-first — no incident-specific tool at all; incidents, like everything else, go through `list_records`/`create_record`/etc. on any table. Breakdown: Table API (6), CMDB (5), System (3), Update Sets (5). Every category is a thin subset of this server's equivalents (e.g. this server's CMDB coverage alone is ~5x larger). No tool-coverage gap — the differentiators are architectural/operational.

## Gaps found

1. No PKCE support — verified via `grep` on `src/auth.ts`/`src/config.ts`: no `pkce`/`code_verifier`/`code_challenge` handling. This server's `oauth` auth method supports `password` and `client_credentials` grants only (server-to-server), not the browser-redirect authorization-code+PKCE flow a public/interactive client would use.
2. No MCP Resources primitive used anywhere — confirmed via `grep -rl "server.resource\|registerResource" src/` returning nothing. Everything here is a Tool.

## Design ideas noted

- OAuth 2.1 + PKCE via a FastMCP proxy, explicitly mirroring ServiceNow's own native Zurich-release AI Control Tower auth model — positions itself as the "use this if you don't have the Now Assist entitlement" alternative to ServiceNow's native MCP server.
- MCP 2026-07-28 stateless protocol support (via FastMCP 4.0, negotiated per connection alongside the legacy handshake).
- MCP Resources — 5 static/reference resources (`table_schema`, `instance_info`, `current_update_set`, `cmdb_classes`, `query_syntax_help`) exposed via the Resources primitive instead of baked into tool descriptions or fetched via a tool call.
- Distribution as a Claude Code Plugin — ships `.claude-plugin/`, `skills/`, `commands/`, `agents/` alongside the MCP server, installable via `claude mcp add` or as a full plugin with slash commands and an agent. Distribution-channel difference, not a capability one.

## Decision & action

Pending as of 2026-08-20. Tool coverage needs no porting. Open question is whether the two protocol/auth gaps are worth closing:
- PKCE would matter only if this server is ever meant to be driven by an interactive/browser-based client rather than the current server-to-server auth methods.
- MCP Resources would matter only if there's value in exposing static reference material (query syntax, schema) as fetchable resources instead of tool-call responses — likely low urgency since tools already serve this on demand.

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| 2026-08-20 | 19 + 5 resources / 406 | Evaluated — pending decision on PKCE / MCP Resources |
