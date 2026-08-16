# ServiceNow MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive MCP (Model Context Protocol) server that gives AI assistants expert-level access to any ServiceNow module. **371 tools across 54 modules.** Connects to a ServiceNow instance via Basic Auth, OAuth, or a bearer token and provides tools for debugging, inspecting configuration, and building features across the entire platform.

## Coverage model

The ServiceNow product documentation spans ~49,000 topics, so this server does **not** ship a tool per feature. Instead it combines two layers, which together give complete, practical coverage:

1. **Universal access (generic tools).** `sn_table_query` / `sn_table_get` / `sn_table_create` / `sn_table_update` / `sn_table_delete`, `sn_aggregate`, `sn_schema_*`, `sn_rest_api_*`, and `sn_batch_request` can read and write **any** table and invoke **any** REST API on the instance. Anything in ServiceNow that is programmatically accessible is reachable today, with no new tool required.
2. **Ergonomic tools (curated).** The `sn_<module>_*` tools are first-class wrappers for high-value workflows — typed parameters, `debug`/`develop` mode-gating, curated field selection, related-record fetch, and dedicated ServiceNow APIs (IRE, `sn_chg_rest`, Service Catalog, Knowledge, CMDB Instance).

So **"coverage" means: high-value capability areas have dedicated ergonomic tools; everything else stays reachable through the generic layer.** Module-by-module passes expand the ergonomic layer where it adds the most value (each pass: completeness vs. the docs + MCP annotations + unit tests + live-instance field verification). Low-value or niche areas are intentionally served by the generic layer rather than bespoke tools.

## Modules

Tools are organized into folders named after ServiceNow product modules (matching the [official ServiceNow docs](https://www.servicenow.com/docs) taxonomy). Each folder has its own README listing every tool and whether it needs `develop` mode.

| ServiceNow module | Folder | Tools | Details |
|-------------------|--------|------:|---------|
| IT Service Management (ITSM) | `it-service-management` | 65 | [README](src/tools/it-service-management/README.md) |
| Now Platform (core) | `now-platform` | 83 | [README](src/tools/now-platform/README.md) |
| Source-to-Pay Operations | `source-to-pay-operations` | 58 | [README](src/tools/source-to-pay-operations/README.md) |
| ServiceNow Platform (CMDB, Knowledge, Interaction, Skills) | `servicenow-platform` | 26 | [README](src/tools/servicenow-platform/README.md) |
| Application Development | `application-development` | 28 | [README](src/tools/application-development/README.md) |
| Platform User Interface | `platform-user-interface` | 26 | [README](src/tools/platform-user-interface/README.md) |
| Integration | `integrate-applications` | 22 | [README](src/tools/integrate-applications/README.md) |
| IT Asset Management (ITAM) | `it-asset-management` | 8 | [README](src/tools/it-asset-management/README.md) |
| Platform Security | `platform-security` | 16 | [README](src/tools/platform-security/README.md) |
| Employee Service Management (HRSD) | `employee-service-management` | 7 | [README](src/tools/employee-service-management/README.md) |
| Security Operations (SecOps) | `security-management` | 7 | [README](src/tools/security-management/README.md) |
| Customer Service Management (CSM) | `customer-service-management` | 6 | [README](src/tools/customer-service-management/README.md) |
| IT Operations Management (ITOM) | `it-operations-management` | 6 | [README](src/tools/it-operations-management/README.md) |
| Governance, Risk & Compliance (GRC) | `governance-risk-compliance` | 6 | [README](src/tools/governance-risk-compliance/README.md) |
| Platform Analytics | `now-intelligence` | 7 | [README](src/tools/now-intelligence/README.md) |

_54 tool modules · 371 tools across 15 ServiceNow module folders._

## Capabilities

This server covers **every major ServiceNow module** — giving an AI assistant the same investigative and development power as a senior ServiceNow developer:

### Core Platform
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Schema & Metadata** | 9 | Inspect table structures, columns, field types, choices, inheritance hierarchies, and reference relationships; create/update dictionary columns and choice values |
| **Table API** | 5 | Query, create, update, delete records on any table |
| **Attachment API** | 4 | List, search, get metadata, and delete file attachments on any record |
| **Batch API** | 1 | Execute multiple REST calls in a single batch request for performance |
| **Data Policies** | 4 | Inspect server-side mandatory/read-only field enforcement rules |
| **Script Execution** | 2 | Run server-side JavaScript using the native Background Scripts engine; optionally self-elevate to security_admin for the script's session |

### ITSM (IT Service Management)
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Incident Management** | 6 | List, get, create, update incidents; major incident tracking; related CIs |
| **Problem Management** | 5 | List, get, create, update problems; known error database; related incidents |
| **Change Management** | 6 | List, get, create, update changes; change tasks; standard templates; conflict detection; approvals |
| **SLAs** | 3 | Inspect SLA definitions and active task SLA tracking records |
| **Approvals & Delegation** | 6 | List pending/stale approvals, trace approval chains, delegation rules |

### Scripting & Automation
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Scripts** | 5 | List, read, search, create, update business rules, script includes, client scripts |
| **Flow Designer** | 5 | Inspect, create, and update flows; inspect actions, subflows, and triggers |
| **Workflows (Legacy)** | 8 | Trace workflow executions, activities, and version history; create/update workflow metadata |

### Service Management
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Service Catalog** | 16 | Browse items, variables, variable sets, client scripts, RITMs, catalog tasks; order items and manage the cart via the Service Catalog API; Catalog UI Policy Action CRUD via background-script engine |
| **Knowledge Management** | 8 | Search articles (KM API), browse bases/categories, manage feedback, create/update articles |
| **Service Portal** | 6 | Inspect portals, pages, widgets (HTML/CSS/scripts), themes, Angular providers |

### CMDB & ITAM
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Configuration Items** | 11 | Browse CIs, relationships, CI classes, impacts |
| **CMDB** | 8 | CI class hierarchy, relationship types; read/create/update CIs via the CMDB Instance API and Identification & Reconciliation (IRE) engine |
| **IT Asset Management** | 8 | Hardware assets, software licenses, software installations, product models |

### ITOM (IT Operations Management)
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Event Management** | 6 | List/push events, query alerts, event rules, event-to-alert correlation |

### Customer & HR
| Module | Tools | What you can do |
|--------|-------|----------------|
| **CSM** | 6 | Customer cases, accounts, contacts, case tasks |
| **HRSD** | 7 | HR cases, lifecycle events (onboarding/offboarding), HR services, profiles |

### Security & Compliance
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Security & ACLs** | 8 | ACLs, UI policies, UI actions, users, groups, roles |
| **SecOps** | 7 | Security incidents, vulnerabilities (NVD), threat observables |
| **GRC** | 6 | Policies, controls, risks, audit engagements, findings |

### Analytics & CI/CD
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Performance Analytics** | 4 | Scorecards, indicators, breakdowns, dashboards |
| **CI/CD & ATF** | 8 | ATF tests/suites/results, apps, plugins, test runner, source control |

### Integration & Middleware
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Scripted REST APIs** | 6 | Inspect REST API definitions, resources, and scripts |
| **Import Sets** | 5 | Import sets, rows, transform maps, field mappings |
| **Notifications** | 4 | Email notifications, email logs, event logs |
| **Integration Hub** | 7 | REST messages, ECC queue, MID servers, REST transaction logs, Integration Hub logs |

### Procurement & S2P
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Procurement** | 17 | Vendors, contracts, purchase orders, cost centers, expenses, stockrooms, spend analysis |
| **Source-to-Pay** | 41 | Full S2P lifecycle: sourcing, negotiations, requisitions, POs, invoices, receipts, ERP |

### Diagnostics & Debugging
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Diagnostics** | 7 | Cluster nodes, cache flushes, slow queries, audit trail, deleted records, instance scan findings |
| **Scheduled Jobs** | 4 | Job definitions, triggers, stuck/orphaned job detection, execution history |
| **Email Debugging** | 6 | Email records, failed emails, full notification trace, email configs |
| **Logs** | 2 | Syslog and transaction log queries |

### Platform Administration
| Module | Tools | What you can do |
|--------|-------|----------------|
| **System Config** | 10 | Properties, scheduled jobs, apps, modules, aggregates, table impact analysis |
| **Update Sets** | 6 | List, inspect, create update sets, review changes, and switch the active update set for the current user |
| **UI Components** | 13 | UI pages, macros, scripts, form layouts, sections, related lists |
| **Domain Separation** | 4 | Domain hierarchy, user/group visibility, domain overrides |
| **Application Scope** | 4 | Scope listing, cross-scope privileges, pending access requests |
| **Upgrade Impact** | 4 | Upgrade history, skipped records, customization inventory, impact summaries |

## Modes

- **Debug mode** (default) — Read-only tools for safe investigation
- **Develop mode** — Full CRUD for building features (includes all debug tools plus create/update/delete operations)

`sn_script_execute`/`sn_script_execute_query` need `SERVICENOW_MODE=develop` **and** a separate `SERVICENOW_ENABLE_SCRIPT_EXECUTE=true` opt-in — see [Script Execution](#script-execution).

## Setup

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` and fill in your credentials:

```env
SERVICENOW_INSTANCE_URL=https://devXXXXX.service-now.com
SERVICENOW_USERNAME=admin
SERVICENOW_PASSWORD=your-password
SERVICENOW_MODE=debug
```

`SERVICENOW_INSTANCE_URL` must be `https://` — the server refuses to start with a plaintext `http://` instance URL (credentials go out as a Basic Auth header / bearer token on every request). The only exception is `http://localhost[:port]`, for a local dev proxy.

## Authentication

Set `SERVICENOW_AUTH_METHOD` to choose how the server authenticates. See `.env.example` for the full set of variables per method.

There's no in-app config page for switching this — MCP clients (Claude Desktop, Claude Code) read `.env` once at process startup, so changing auth method or credentials always means editing `.env` and restarting the MCP connection. `npm run setup` is an interactive wizard for that: it prompts for the method and only the fields it needs, masks secret input, and writes everything through `dotenvx set` so `.env` stays encrypted. Run it any time you want to switch methods or rotate credentials, then restart the connection.

| Method | Env var | Notes |
|---|---|---|
| `basic` (default) | `SERVICENOW_USERNAME` / `SERVICENOW_PASSWORD` | Simplest option. |
| `bearer` | `SERVICENOW_ACCESS_TOKEN` | ServiceNow has no long-lived personal-access-token concept — this must be a ServiceNow-issued OAuth access token (same kind `oauth` fetches automatically, just pre-obtained by you) or an externally-issued OIDC/JWT token trusted via Multi-Provider SSO / External OAuth (instance-admin config, not default). Typically short-lived and not auto-refreshed by this server. If you don't already have a token from elsewhere, use `oauth` instead. |
| `oauth` | `SERVICENOW_OAUTH_CLIENT_ID` / `SERVICENOW_OAUTH_CLIENT_SECRET` (+ `SERVICENOW_OAUTH_USERNAME`/`PASSWORD` for the default `password` grant) | Uses ServiceNow's own `/oauth_token.do` endpoint. Tokens are cached and refreshed automatically, with a one-shot re-auth retry on 401. Requires an OAuth application registered on the instance under System OAuth > Application Registry. |

**Background-script tool:** regardless of `SERVICENOW_AUTH_METHOD`, keep `SERVICENOW_USERNAME`/`SERVICENOW_PASSWORD` set if you want the background-script execution tool to work. It logs in through ServiceNow's UI (`sys.scripts.do`) rather than a REST endpoint, so it always needs a real username/password session — there's no OAuth or bearer-token equivalent for it.

**Company/Microsoft SSO:** this server runs headless, so it can't complete an interactive Azure AD login. If your instance enforces SSO for all users, either use a ServiceNow integration account excluded from SSO enforcement with the `oauth` method, or — if your instance's Multi-Provider SSO is configured to accept externally-issued Azure AD tokens for API auth — obtain that token yourself (e.g. via an MSAL client-credentials flow) and supply it through `SERVICENOW_AUTH_METHOD=bearer`.

## Script Execution

`sn_script_execute`/`sn_script_execute_query` run arbitrary server-side JavaScript against the instance via the Background Scripts engine — the highest-impact capability this server exposes, roughly equivalent to shell access on the instance. They're gated behind two independent settings that must both be set:

1. `SERVICENOW_MODE=develop`
2. `SERVICENOW_ENABLE_SCRIPT_EXECUTE=true`

Turning on `develop` mode for ordinary create/update/delete work does **not** by itself expose script execution — the second flag is a deliberate, separate opt-in.

**Per-call confirmation via elicitation.** On top of the two gates above, `sn_script_execute` asks the human to confirm the exact script through the MCP client's elicitation UI (protocol 2025-11-25, `elicitation/create`) before it runs — a runtime prompt, not just a one-time env var. If the connected client doesn't support elicitation, the tool falls back to running on the two gates alone rather than becoming permanently unusable; any other elicitation failure (timeout, transport error) blocks execution. `sn_script_execute_query` does not prompt — it only builds a scoped, escaped GlideRecord query from structured parameters (table/query/fields), not free-form script.

**If you enable this with an AI assistant driving the tool calls:** treat script content the same way you'd treat a command an assistant is about to run in a real shell. Don't let it construct or run a script based on content it read during the session (an incident description, a KB article, an email body, an attachment) — that data is untrusted and could contain instructions planted specifically to make the assistant execute something harmful. Only scripts the user explicitly asked for or wrote themselves should reach this tool.

## Role Elevation (security_admin)

`sn_script_execute` accepts `elevate_security_admin: true`, which activates the `security_admin` role for that script's background-script session — the scripted equivalent of the "Elevate Roles" UI action, using the undocumented `GlideSecurityManager.get().enableElevatedRole()` API (no official REST endpoint exists for this).

Real limits, not aspirational ones:
- It only **activates** a role the `SERVICENOW_USERNAME` account already has assigned. It cannot grant `security_admin` to an account that doesn't hold it, and this fork does not implement impersonating another user to work around that — self-elevation only.
- It only affects that one background script's session. It does **not** elevate the Table API create/update tools elsewhere in this server (schema, script, workflow, update-set) — those are stateless REST calls with no session to elevate.
- If the account lacks the role, the tool fails with a clear error instead of silently running unelevated.

**`sn_acl_create`/`sn_acl_update` auto-elevate — no flag needed.** ACLs (`sys_security_acl`) are the one table where ServiceNow itself refuses writes without an active security_admin elevation, so these two tools always route through the background-script engine with elevation forced on, rather than the plain Table API every other create/update tool uses. Same underlying limit applies: the `SERVICENOW_USERNAME` account must already hold `security_admin` directly.

## Running

```bash
# Default (.env)
npm start

# Specific instance
SERVICENOW_ENV_FILE=.env npm start

# Development with tsx
SERVICENOW_ENV_FILE=.env npm run dev
```

## Multiple Instances

Create separate env files per instance (`.env`, `.env.prod`, etc.) and switch with `SERVICENOW_ENV_FILE`.

## Claude Code Integration

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "servicenow": {
      "command": "node",
      "args": ["/path/to/servicenow-mcp/dist/index.js"],
      "env": {
        "SERVICENOW_ENV_FILE": "/path/to/servicenow-mcp/.env"
      }
    }
  }
}
```

## MCP Inspector

```bash
SERVICENOW_ENV_FILE=.env npx @modelcontextprotocol/inspector node dist/index.js
```

## Claude Code Skills

This project includes Claude Code skills:

```
/servicenow-sourcing-procurement [describe what you want to debug or develop]
/servicenow-mcp-doc-review        [optional: focus a module/API area]
```

`servicenow-mcp-doc-review` audits the MCP's tool coverage against ServiceNow's documentation (using the local docs clone when available) and produces a prioritized improvement plan.

The S2P skill provides:
- **Live instance schema discovery** — query `sys_dictionary` and `sys_db_object` to find tables and columns
- **Plugin validation** — verify S2P plugins (`sn_shop`, `sn_fin`, `sn_ap_apm`, etc.) are installed and active
- **Workflow debugging** — trace sourcing requests end-to-end, debug approval routing, invoice matching failures, and ERP integration errors
- **Tool building templates** — exact patterns, client API reference, and query syntax for creating new tools
- **MCP Inspector testing** — build and test tools against a live instance
