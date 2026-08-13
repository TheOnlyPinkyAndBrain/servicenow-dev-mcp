# ServiceNow MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive MCP (Model Context Protocol) server that gives AI assistants expert-level access to any ServiceNow module. **306 tools across 44 modules.** Connects to a ServiceNow instance via Basic Auth, OAuth, or a bearer token and provides tools for debugging, inspecting configuration, and building features across the entire platform.

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
| **Service Catalog** | 8 | Browse items, variables, variable sets, client scripts, RITMs, catalog tasks |
| **Knowledge Management** | 8 | Search articles (KM API), browse bases/categories, manage feedback, create/update articles |
| **Service Portal** | 6 | Inspect portals, pages, widgets (HTML/CSS/scripts), themes, Angular providers |

### CMDB & ITAM
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Configuration Items** | 11 | Browse CIs, relationships, CI classes, impacts |
| **CMDB** | 4 | CI class hierarchy, relationship types |
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

## Authentication

Set `SERVICENOW_AUTH_METHOD` to choose how the server authenticates. See `.env.example` for the full set of variables per method.

| Method | Env var | Notes |
|---|---|---|
| `basic` (default) | `SERVICENOW_USERNAME` / `SERVICENOW_PASSWORD` | Simplest option. |
| `bearer` | `SERVICENOW_ACCESS_TOKEN` | Static token you fetch/rotate yourself. |
| `oauth` | `SERVICENOW_OAUTH_CLIENT_ID` / `SERVICENOW_OAUTH_CLIENT_SECRET` (+ `SERVICENOW_OAUTH_USERNAME`/`PASSWORD` for the default `password` grant) | Uses ServiceNow's own `/oauth_token.do` endpoint. Tokens are cached and refreshed automatically, with a one-shot re-auth retry on 401. Requires an OAuth application registered on the instance under System OAuth > Application Registry. |

**Background-script tool:** regardless of `SERVICENOW_AUTH_METHOD`, keep `SERVICENOW_USERNAME`/`SERVICENOW_PASSWORD` set if you want the background-script execution tool to work. It logs in through ServiceNow's UI (`sys.scripts.do`) rather than a REST endpoint, so it always needs a real username/password session — there's no OAuth or bearer-token equivalent for it.

**Company/Microsoft SSO:** this server runs headless, so it can't complete an interactive Azure AD login. If your instance enforces SSO for all users, either use a ServiceNow integration account excluded from SSO enforcement with the `oauth` method, or — if your instance's Multi-Provider SSO is configured to accept externally-issued Azure AD tokens for API auth — obtain that token yourself (e.g. via an MSAL client-credentials flow) and supply it through `SERVICENOW_AUTH_METHOD=bearer`.

## Role Elevation (security_admin)

`sn_script_execute` accepts `elevate_security_admin: true`, which activates the `security_admin` role for that script's background-script session — the scripted equivalent of the "Elevate Roles" UI action, using the undocumented `GlideSecurityManager.get().enableElevatedRole()` API (no official REST endpoint exists for this).

Real limits, not aspirational ones:
- It only **activates** a role the `SERVICENOW_USERNAME` account already has assigned. It cannot grant `security_admin` to an account that doesn't hold it, and this fork does not implement impersonating another user to work around that — self-elevation only.
- It only affects that one background script's session. It does **not** elevate the Table API create/update tools elsewhere in this server (schema, script, workflow, update-set) — those are stateless REST calls with no session to elevate.
- If the account lacks the role, the tool fails with a clear error instead of silently running unelevated.

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

This project includes a Claude Code skill for S2P development and debugging:

```
/servicenow-sourcing-procurement [describe what you want to debug or develop]
```

The skill provides:
- **Live instance schema discovery** — query `sys_dictionary` and `sys_db_object` to find tables and columns
- **Plugin validation** — verify S2P plugins (`sn_shop`, `sn_fin`, `sn_ap_apm`, etc.) are installed and active
- **Workflow debugging** — trace sourcing requests end-to-end, debug approval routing, invoice matching failures, and ERP integration errors
- **Tool building templates** — exact patterns, client API reference, and query syntax for creating new tools
- **MCP Inspector testing** — build and test tools against a live instance
