# ServiceNow MCP Server

## Project Overview

A comprehensive MCP (Model Context Protocol) server providing expert-level access to ServiceNow instances. v3.11.0 with 353 tools across 54 modules.

## Coverage Model

The ServiceNow docs span ~49,000 topics, so the server does not ship a tool per feature. Two layers give complete practical coverage:
1. **Universal access** — the generic tools (`sn_table_*`, `sn_aggregate`, `sn_schema_*`, `sn_rest_api_*`, `sn_batch_request`) reach any table / REST API on the instance. Anything programmatically accessible is already reachable.
2. **Ergonomic tools** — the `sn_<module>_*` tools are curated wrappers for high-value workflows (typed params, mode-gating, curated fields, related-record fetch, dedicated APIs).

"Coverage/parity" = high-value areas get dedicated ergonomic tools; everything else is served by the generic layer. When deciding whether to add a tool: add it only if the area is high-value/high-frequency; otherwise rely on the generic layer. Module passes expand the ergonomic layer (completeness vs. docs + annotations + tests + live field verification).

## Architecture

- **Entry point**: `src/index.ts` — creates MCP server, loads config, registers all tool modules
- **Registry**: `src/tools/registry.ts` — single source of truth for the `registrars` array (every `registerXxxTools`). Both `index.ts` and the contract test import it, so a new module added here is automatically covered by tests. Add new modules to this array.
- **Client**: `src/client.ts` — `ServiceNowClient` class wrapping ServiceNow Table API, Aggregate API, and generic REST
- **Config**: `src/config.ts` — loads and validates env vars via Zod
- **Types**: `src/types.ts` — shared TypeScript types (`Mode`, `ServiceNowConfig`, `QueryParams`, `PaginatedResult`)
- **Utils**: `src/utils.ts` — shared helpers (`errorResult`, `jsonResult`, `textResult`, `buildQuery`)
- **Tools**: `src/tools/<servicenow-module>/*.ts` — 54 tool modules grouped into 15 folders named after ServiceNow product modules (e.g. `it-service-management/`, `it-operations-management/`, `it-asset-management/`, `servicenow-platform/`, `now-platform/`, `platform-security/`, `platform-user-interface/`, `application-development/`, `integrate-applications/`, `customer-service-management/`, `employee-service-management/`, `security-management/`, `governance-risk-compliance/`, `now-intelligence/`, `source-to-pay-operations/`). Each module exports a `registerXxxTools(server, client, mode)` function. Folder names match the ServiceNow docs taxonomy (`/Users/sukhmal/code/ServiceNow/ServiceNowDocs/markdown/`).

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
npm test                        # run the vitest suite
```

## Testing

- **Framework**: vitest; tests live in `test/*.test.ts` (not compiled into `dist/` — `tsconfig` is scoped to `src`).
- **Contract test** (`test/contract.test.ts`): exercises every registrar from `src/tools/registry.ts` with a mock server/client and asserts no duplicate tool names, valid `sn_snake_case` names, non-empty descriptions, valid zod schemas, and mode-gating (debug tools ⊆ develop tools). This runs without a live instance and catches whole classes of registration/schema bugs the TypeScript build cannot.
- CI runs `npm run build` + `npm test` on Node 20.x and 22.x (required check), plus `npm audit` and OSV-Scanner.
- No live-instance tests run in CI (no credentials); per-module logic is tested with mocked client responses.

## Environment Variables

- `SERVICENOW_INSTANCE_URL` — instance URL (no trailing slash)
- `SERVICENOW_USERNAME` / `SERVICENOW_PASSWORD` — Basic Auth credentials
- `SERVICENOW_MODE` — `debug` (read-only, default) or `develop` (read-write)
- `SERVICENOW_ENV_FILE` — path to .env file (default: `.env`)

## Script Execution

The `sn_script_execute` tool (develop mode only) runs server-side scripts using ServiceNow's native Background Scripts engine (`sys.scripts.do`). The client establishes an authenticated session via `login.do`, obtains a CSRF token, then submits scripts as form POSTs — exactly as the Background Scripts UI does. Output from `gs.print()` is captured and returned. HTML entities in the response are automatically decoded. Session is cached and auto-refreshed on expiry.
