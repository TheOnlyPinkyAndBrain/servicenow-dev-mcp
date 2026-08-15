# ServiceNow MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive MCP (Model Context Protocol) server that gives AI assistants expert-level access to any ServiceNow module. **353 tools across 54 modules.** Connects to a ServiceNow instance via Basic Auth and provides tools for debugging, inspecting configuration, and building features across the entire platform.

## Coverage model

The ServiceNow product documentation spans ~49,000 topics, so this server does **not** ship a tool per feature. Instead it combines two layers, which together give complete, practical coverage:

1. **Universal access (generic tools).** `sn_table_query` / `sn_table_get` / `sn_table_create` / `sn_table_update` / `sn_table_delete`, `sn_aggregate`, `sn_schema_*`, `sn_rest_api_*`, and `sn_batch_request` can read and write **any** table and invoke **any** REST API on the instance. Anything in ServiceNow that is programmatically accessible is reachable today, with no new tool required.
2. **Ergonomic tools (curated).** The `sn_<module>_*` tools are first-class wrappers for high-value workflows — typed parameters, `debug`/`develop` mode-gating, curated field selection, related-record fetch, and dedicated ServiceNow APIs (IRE, `sn_chg_rest`, Service Catalog, Knowledge, CMDB Instance).

So **"coverage" means: high-value capability areas have dedicated ergonomic tools; everything else stays reachable through the generic layer.** Module-by-module passes expand the ergonomic layer where it adds the most value (each pass: completeness vs. the docs + MCP annotations + unit tests + live-instance field verification). Low-value or niche areas are intentionally served by the generic layer rather than bespoke tools.

## Modules

Tools are organized into folders named after ServiceNow product modules (matching the [official ServiceNow docs](https://www.servicenow.com/docs) taxonomy). Each folder has its own README listing every tool and whether it needs `develop` mode.

| ServiceNow module | Folder | Tools | Details |
|-------------------|--------|------:|---------|
| IT Service Management (ITSM) | `it-service-management` | 61 | [README](src/tools/it-service-management/README.md) |
| Now Platform (core) | `now-platform` | 78 | [README](src/tools/now-platform/README.md) |
| Source-to-Pay Operations | `source-to-pay-operations` | 58 | [README](src/tools/source-to-pay-operations/README.md) |
| ServiceNow Platform (CMDB, Knowledge, Interaction, Skills) | `servicenow-platform` | 26 | [README](src/tools/servicenow-platform/README.md) |
| Application Development | `application-development` | 26 | [README](src/tools/application-development/README.md) |
| Platform User Interface | `platform-user-interface` | 22 | [README](src/tools/platform-user-interface/README.md) |
| Integration | `integrate-applications` | 22 | [README](src/tools/integrate-applications/README.md) |
| IT Asset Management (ITAM) | `it-asset-management` | 8 | [README](src/tools/it-asset-management/README.md) |
| Platform Security | `platform-security` | 16 | [README](src/tools/platform-security/README.md) |
| Employee Service Management (HRSD) | `employee-service-management` | 7 | [README](src/tools/employee-service-management/README.md) |
| Security Operations (SecOps) | `security-management` | 7 | [README](src/tools/security-management/README.md) |
| Customer Service Management (CSM) | `customer-service-management` | 6 | [README](src/tools/customer-service-management/README.md) |
| IT Operations Management (ITOM) | `it-operations-management` | 6 | [README](src/tools/it-operations-management/README.md) |
| Governance, Risk & Compliance (GRC) | `governance-risk-compliance` | 6 | [README](src/tools/governance-risk-compliance/README.md) |
| Platform Analytics | `now-intelligence` | 4 | [README](src/tools/now-intelligence/README.md) |

_54 tool modules · 353 tools across 15 ServiceNow module folders._

## Capabilities

This server covers **every major ServiceNow module** — giving an AI assistant the same investigative and development power as a senior ServiceNow developer:

### Core Platform
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Schema & Metadata** | 5 | Inspect table structures, columns, field types, choices, inheritance hierarchies, and reference relationships |
| **Table API** | 5 | Query, create, update, delete records on any table |
| **Attachment API** | 4 | List, search, get metadata, and delete file attachments on any record |
| **Batch API** | 1 | Execute multiple REST calls in a single batch request for performance |
| **Data Policies** | 4 | Inspect server-side mandatory/read-only field enforcement rules |
| **Script Execution** | 2 | Run server-side JavaScript using the native Background Scripts engine |

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
| **Flow Designer** | 5 | Inspect flows, actions, subflows, and triggers |
| **Workflows (Legacy)** | 6 | Trace workflow executions, activities, and version history |

### Service Management
| Module | Tools | What you can do |
|--------|-------|----------------|
| **Service Catalog** | 12 | Browse items, variables, variable sets, client scripts, RITMs, catalog tasks; order items and manage the cart via the Service Catalog API |
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
| **Update Sets** | 5 | List, inspect, create update sets and review changes |
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
