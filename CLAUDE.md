# ServiceNow MCP Server

## Project Overview

A comprehensive MCP (Model Context Protocol) server providing expert-level access to ServiceNow instances. v3.1.0 with 307 tools across 44 modules.

## Architecture

- **Entry point**: `src/index.ts` — creates MCP server, loads config, registers all tool modules
- **Client**: `src/client.ts` — `ServiceNowClient` class wrapping ServiceNow Table API, Aggregate API, and generic REST
- **Config**: `src/config.ts` — loads and validates env vars via Zod
- **Types**: `src/types.ts` — shared TypeScript types (`Mode`, `ServiceNowConfig`, `QueryParams`, `PaginatedResult`)
- **Utils**: `src/utils.ts` — shared helpers (`errorResult`, `jsonResult`, `textResult`, `buildQuery`)
- **Tools**: `src/tools/<servicenow-module>/*.ts` — 44 tool modules grouped into 15 folders named after ServiceNow product modules (e.g. `it-service-management/`, `it-operations-management/`, `it-asset-management/`, `servicenow-platform/`, `now-platform/`, `platform-security/`, `platform-user-interface/`, `application-development/`, `integrate-applications/`, `customer-service-management/`, `employee-service-management/`, `security-management/`, `governance-risk-compliance/`, `now-intelligence/`, `source-to-pay-operations/`). Each module exports a `registerXxxTools(server, client, mode)` function. Folder names match the ServiceNow docs taxonomy (`/Users/sukhmal/code/ServiceNow/ServiceNowDocs/markdown/`).

## Tool Module Pattern

Every tool module follows this pattern:
```typescript
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";

export function registerXxxTools(server: McpServer, client: ServiceNowClient, mode: Mode): void {
  // Read-only tools registered for both modes
  server.tool("sn_xxx_list", "description", { /* zod schema */ }, async (params) => { ... });

  // Guard for develop-only tools
  if (mode !== "develop") return;

  // Write tools registered only in develop mode
  server.tool("sn_xxx_create", "description", { /* zod schema */ }, async (params) => { ... });
}
```

## Key Conventions

- Tool names use `sn_` prefix with snake_case: `sn_module_action`
- All tools return JSON via `jsonResult()` or errors via `errorResult()`
- Read-only tools work in both `debug` and `develop` modes
- Write tools (create/update/delete) are gated behind `mode === "develop"`
- Queries use ServiceNow encoded query syntax (e.g., `active=true^priority=1`)
- `sysparm_display_value: "true"` is used where human-readable values help (schema, security, relationships)
- Numeric params use `z.coerce.number()` (MCP clients may send strings); free-form field maps use `z.record(z.string(), z.unknown())` — zod 4 requires an explicit key type
- Tool names must be globally unique across all modules (duplicate `server.tool` names crash the server at startup)

## Build & Run

```bash
npm install && npm run build   # compile TypeScript
npm start                       # run compiled server
npm run dev                     # run with tsx (no build needed)
```

## Environment Variables

- `SERVICENOW_INSTANCE_URL` — instance URL (no trailing slash)
- `SERVICENOW_USERNAME` / `SERVICENOW_PASSWORD` — Basic Auth credentials
- `SERVICENOW_MODE` — `debug` (read-only, default) or `develop` (read-write)
- `SERVICENOW_ENV_FILE` — path to .env file (default: `.env`)

## Script Execution

The `sn_script_execute` tool (develop mode only) runs server-side scripts using ServiceNow's native Background Scripts engine (`sys.scripts.do`). The client establishes an authenticated session via `login.do`, obtains a CSRF token, then submits scripts as form POSTs — exactly as the Background Scripts UI does. Output from `gs.print()` is captured and returned. HTML entities in the response are automatically decoded. Session is cached and auto-refreshed on expiry.
