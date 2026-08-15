---
name: servicenow-sourcing-procurement
description: Debug and develop ServiceNow Source-to-Pay (S2P) sourcing and procurement features against a live instance. Use when the user wants to discover S2P table schemas, validate plugin installations, debug workflows, test tools, create sample data, or build new S2P tools.
user-invocable: true
argument-hint: [describe what you want to debug, develop, or explore]
---

# ServiceNow S2P Development & Debugging Assistant

You help developers debug and develop Source-to-Pay features against a live ServiceNow instance. You can discover schemas, validate configurations, trace workflow issues, and build new tools.

## How to Query the Live Instance

The instance is accessible via its Table API. Use `curl` commands or the existing MCP tools to interact with it. The `.env` file contains credentials.

### Direct API Calls (for discovery and debugging)

```bash
# Load credentials
source .env 2>/dev/null || true
INSTANCE="$SERVICENOW_INSTANCE_URL"
AUTH="$SERVICENOW_USERNAME:$SERVICENOW_PASSWORD"

# Query any table
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/{tableName}?sysparm_limit=5&sysparm_display_value=true" | jq .

# Get table schema (columns)
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_dictionary?sysparm_query=name={tableName}^internal_type!=collection&sysparm_fields=element,column_label,internal_type,max_length,mandatory,reference&sysparm_limit=200" | jq '.result[] | {element, column_label, internal_type, reference}'

# Check if a table exists
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_db_object?sysparm_query=name={tableName}&sysparm_fields=name,label,super_class,sys_scope" | jq .

# Discover tables by scope
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_db_object?sysparm_query=sys_scope.scope={scopeName}&sysparm_fields=name,label,super_class&sysparm_limit=100" | jq '.result[] | {name, label}'

# Check plugin status
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/v_plugin?sysparm_query=idLIKE{pluginId}&sysparm_fields=id,name,state" | jq .

# Run aggregate query
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/stats/{tableName}?sysparm_count=true" | jq .

# Get record count for a table
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/stats/{tableName}?sysparm_count=true" | jq '.result.stats.count'
```

## Debugging Workflows

### 1. Validate S2P Plugin Installation

Check these plugins are active on the instance:

| Plugin ID | Name | Key Tables |
|-----------|------|------------|
| `sn_shop` | S2P Common Architecture | `sn_shop_purchase_order`, `sn_shop_purchase_requisition`, `sn_shop_sourcing_activity` |
| `sn_fin` | Finance Common Architecture | `sn_fin_supplier`, `sn_fin_legal_entity`, `sn_fin_gl_account` |
| `sn_ap_apm` | AP Invoice Processing | `sn_ap_apm_invoice_exception` |
| `sn_ap_cm` | Invoice Case Management | `sn_ap_cm_invoice_case` |
| `sn_spend_psd` | Procurement Case Management | `sn_spend_psd_procurement_request` |
| `sn_pr` | Sourcing & Purchasing Automation | `sn_pr_purchase_work_item` |
| `sn_spend_intg` | S2P Integration Framework | `sn_spend_intg_erp_source` |
| `com.snc.procurement` | Legacy Procurement | `proc_po`, `proc_po_item` |

```bash
# Quick check — query sys_db_object for all sn_shop tables
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_db_object?sysparm_query=nameSTARTSWITHsn_shop&sysparm_fields=name,label&sysparm_limit=100" | jq '.result[] | .name'
```

### 2. Discover Table Schema for New Tools

When building a new tool, first discover what columns exist:

```bash
# Get all columns for a table (including inherited from parent)
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_dictionary?sysparm_query=name={tableName}^internal_type!=collection^elementISNOTEMPTY&sysparm_fields=element,column_label,internal_type,max_length,mandatory,reference,default_value&sysparm_limit=200&sysparm_display_value=true" | jq '.result | sort_by(.element)'
```

Important: S2P tables use **inheritance**. Check the parent class to find inherited columns:
- `sn_shop_purchase_order` extends `sn_shop_order` (Order Template)
- `sn_shop_purchase_requisition` extends `sn_shop_order`
- `sn_shop_purchase_order_line` extends `sn_shop_line` (Shop Line)
- `sn_shop_invoice` extends `sn_fin_base_invoice`
- `sn_spend_psd_procurement_request` extends Finance Case (task-based)

```bash
# Find parent table
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_db_object?sysparm_query=name={tableName}&sysparm_fields=name,label,super_class&sysparm_display_value=true" | jq '.result[0].super_class'
```

### 3. Debug Approval Routing

```bash
# Find pending approvals for a specific document
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sysapproval_approver?sysparm_query=document_id={sysId}^state=requested&sysparm_display_value=true" | jq .

# Check approval rules that apply to S2P tables
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_shop_approval_plan?sysparm_display_value=true&sysparm_limit=20" | jq .
```

### 4. Debug ERP Integration Errors

```bash
# Find recent ERP sync failures
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_spend_intg_erp_error?sysparm_query=ORDERBYDESCsys_created_on&sysparm_limit=10&sysparm_display_value=true" | jq .

# Check ERP source configuration
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_spend_intg_erp_source?sysparm_display_value=true" | jq .
```

### 5. Debug Invoice Matching Failures

```bash
# Find invoice exceptions
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_ap_apm_invoice_exception?sysparm_query=ORDERBYDESCsys_created_on&sysparm_limit=10&sysparm_display_value=true" | jq .

# Check tolerance rules
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_ap_apm_tolerance_rule?sysparm_display_value=true" | jq .

# Trace an invoice to its PO and receipt for 3-way match debugging
# 1. Get the invoice
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_shop_invoice/{invoiceSysId}?sysparm_display_value=all" | jq .
# 2. Get PO lines linked to invoice lines
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_shop_invoice_line?sysparm_query=invoice={invoiceSysId}&sysparm_display_value=true" | jq .
```

### 6. Trace a Sourcing Request End-to-End

```bash
SR_ID="{sys_id_of_sourcing_request}"

# 1. The sourcing request itself
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_shop_sourcing_activity/$SR_ID?sysparm_display_value=true" | jq .result

# 2. Linked negotiation event
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_shop_negotiation_event?sysparm_query=sourcing_activities=$SR_ID&sysparm_display_value=true" | jq .

# 3. Negotiations (supplier bids)
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_shop_negotiation?sysparm_query=sourcing_activity=$SR_ID&sysparm_display_value=true" | jq .

# 4. Resulting requisition
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_shop_purchase_requisition?sysparm_query=sourcing_activity=$SR_ID&sysparm_display_value=true" | jq .

# 5. Resulting PO
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sn_shop_purchase_order?sysparm_query=sourcing_activity=$SR_ID&sysparm_display_value=true" | jq .
```

## Building New Tools

### Tool Module Pattern

Every tool in this project follows this exact pattern. Use it when adding new tools:

```typescript
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerXxxTools(server: McpServer, client: ServiceNowClient, mode: Mode): void {
  // Read-only tools — registered in both debug and develop modes
  server.tool(
    "sn_xxx_list",
    "Description of what this lists and when to use it.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("table_name", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,...",
          sysparm_limit: limit,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });

        return jsonResult({
          totalCount: result.totalCount,
          count: result.records.length,
          records: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // Write tools — only in develop mode
  if (mode !== "develop") return;

  server.tool(
    "sn_xxx_create",
    "Create a new xxx record.",
    {
      name: z.string().describe("Name of the record"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    async ({ name, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { name, ...additional_fields };
        const result = await client.create("table_name", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
```

### Checklist for Adding a New Tool

1. **Discover the table**: Query `sys_db_object` on the live instance to confirm table name and scope
2. **Get the schema**: Query `sys_dictionary` to find all columns, types, and references
3. **Check inheritance**: Find the parent table — inherited columns won't appear in the child's `sys_dictionary` entries
4. **Check for data**: Query the table with `sysparm_limit=1` to see if records exist
5. **Pick fields**: Choose the most useful fields for `sysparm_fields` — don't return everything
6. **Add filters**: Add Zod parameters for commonly-filtered columns (status, name, type, etc.)
7. **Use `sysparm_display_value: "true"`** for reference fields and choice lists
8. **For "get" tools**: Use `Promise.all` to fetch related records in parallel (lines, tasks, etc.)
9. **Register in `src/index.ts`**: Import and add to the `registrars` array
10. **Build and verify**: `npm run build` — TypeScript catches most issues
11. **Test against instance**: Use MCP Inspector or curl to verify the tool works

### Registration in index.ts

After creating `src/tools/your-module.ts`:

```typescript
// In src/index.ts — add import
import { registerYourModuleTools } from "./tools/your-module.js";

// Add to the registrars array
const registrars = [
  // ... existing registrars
  registerYourModuleTools,
];
```

### ServiceNow Query Syntax Reference

```
field=value              # equals
field!=value             # not equals
fieldLIKEvalue           # contains
fieldSTARTSWITHvalue     # starts with
fieldINval1,val2,val3    # in list
field>value              # greater than
field<value              # less than
field>=value             # greater or equal
field<=value             # less or equal
fieldISNOTEMPTY          # not empty
fieldISEMPTY             # is empty
^                        # AND (join conditions)
^OR                      # OR
^NQ                      # new query (nested)
ORDERBYfield             # sort ascending
ORDERBYDESCfield         # sort descending
field.subfield=value     # dot-walk through references
```

### Client API Reference

```typescript
// Query with pagination
client.query(tableName, {
  sysparm_query: "active=true^ORDERBYname",
  sysparm_fields: "sys_id,name,...",
  sysparm_limit: 20,
  sysparm_offset: 0,
  sysparm_display_value: "true",
}) → PaginatedResult<T>  // { records, totalCount, limit, offset }

// Get single record
client.getById(tableName, sysId, fields?) → T

// Create record (develop mode only)
client.create(tableName, body) → T

// Update record (develop mode only)
client.update(tableName, sysId, body) → T

// Delete record (develop mode only)
client.delete(tableName, sysId) → void

// Aggregate / stats query
client.aggregate(tableName, {
  sysparm_query?, sysparm_group_by?, sysparm_count?,
  sysparm_sum_fields?, sysparm_avg_fields?,
  sysparm_min_fields?, sysparm_max_fields?,
}) → Record<string, unknown>[]

// Run background script (develop mode only)
client.executeBackgroundScript(script, scope?) → BackgroundScriptResult

// Generic REST API call
client.restApi(method, apiPath, body?) → T
```

## S2P Application Scopes Quick Reference

| Scope | Purpose | Key Tables |
|-------|---------|------------|
| `sn_shop` | Orders, POs, requisitions, sourcing, negotiations | `sn_shop_purchase_order`, `sn_shop_sourcing_activity`, `sn_shop_negotiation_event` |
| `sn_fin` | Suppliers, legal entities, GL accounts, tax codes | `sn_fin_supplier`, `sn_fin_legal_entity`, `sn_fin_gl_account` |
| `sn_ap_apm` | Invoice exceptions, tolerance rules | `sn_ap_apm_invoice_exception`, `sn_ap_apm_tolerance_rule` |
| `sn_ap_cm` | Invoice dispute cases | `sn_ap_cm_invoice_case` |
| `sn_spend_psd` | Procurement cases, tasks | `sn_spend_psd_procurement_request`, `sn_spend_psd_procurement_task` |
| `sn_pr` | Purchase work items, automation steps | `sn_pr_purchase_work_item` |
| `sn_spend_intg` | ERP integration staging | `sn_spend_intg_erp_source`, `sn_spend_intg_erp_error` |

## Testing with MCP Inspector

```bash
# Build and test against live instance
npm run build
SERVICENOW_ENV_FILE=.env npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a browser UI where you can invoke any tool interactively and see the raw JSON response from the instance.
