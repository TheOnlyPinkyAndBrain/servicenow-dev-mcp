---
source: https://github.com/pavecer/mcp-server-servicenow
owner: pavecer
repo: mcp-server-servicenow
first_discovered: 2026-08-20
last_synced: 2026-08-20
status: Not merged
language: TypeScript
stars_at_last_sync: 1
license: unknown
hosting: Azure Functions v4 (also standalone Docker/Container Apps)
tool_count_theirs_at_last_sync: 6 tools
tool_count_ours_at_last_sync: 409 tools / 55 modules
vector: status/not-merged lang/typescript stars/1 scope/catalog-ordering-only area/catalog area/request gaps/0 idea/entra-obo-auth idea/dynamic-oauth-registration idea/adaptive-cards idea/azure-functions-hosting
---

# pavecer/mcp-server-servicenow

## Summary

Single-purpose, narrow server covering only Service Catalog ordering: `search_catalog_items`, `get_catalog_item_form`, `place_order`, `list_user_orders`, `update_order`, `validate_servicenow_config`. Node.js 20+, Express 4, `@modelcontextprotocol/sdk` ^1.29.0, Zod 4, Axios. Not a tool-coverage competitor by design — it's a reference implementation for exposing one ServiceNow workflow (catalog self-service) to Microsoft Copilot Studio specifically, not a general-purpose ServiceNow MCP server. All 6 tools are already covered, more completely, by this server's `sn_catalog_*`/`sn_request_*` tools.

## Gaps found

None in tool coverage — this repo isn't attempting broad coverage.

## Design ideas noted

All about deployment/integration pattern, not ServiceNow API surface:

- **Entra ID (Azure AD) OAuth with On-Behalf-Of (OBO) token exchange** — the calling human's own identity is exchanged (via `@azure/msal-node`) into a ServiceNow-accepted token, so ServiceNow-side ACLs and audit trails reflect the real end user rather than a shared integration account. This is a materially different security model than this server's current `oauth` auth method (which only supports `password` and `client_credentials` grants — always acting as one configured integration user). Not adopted now: this is Microsoft-ecosystem-specific (Entra tenant, MSAL) and would be a significant, narrowly-scoped addition serving one deployment scenario (Copilot Studio / Entra-tenant customers) rather than the general MCP client base this server targets. Worth remembering as a future direction if per-user delegated ServiceNow access (as opposed to shared-service-account access) ever becomes a real requirement.
- Dynamic OAuth client registration (RFC 7591, `/oauth/register`) so a client like Copilot Studio can self-provision — not relevant outside that ecosystem.
- Adaptive Cards as the tool response format (Microsoft's chat-UI card schema) — ties the server's output format to one specific client family; this server's plain-JSON/Markdown responses are more broadly client-agnostic and shouldn't be narrowed to serve one client.
- Azure Functions serverless hosting model with a fresh `McpServer` instance per HTTP request — a hosting/ops pattern, not applicable to this server's current stdio-first distribution model.

## Decision & action

No action. This repo's differentiators are all deployment/integration-pattern choices for a specific enterprise chat surface (Microsoft Copilot Studio), not ServiceNow tool coverage. Nothing here fits this server's general-purpose, client-agnostic design without narrowing it.

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| 2026-08-20 | 6 / 409 | Evaluated — no action |
