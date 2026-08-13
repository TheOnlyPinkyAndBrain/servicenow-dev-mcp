import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import { ServiceNowApiError } from "../client.js";
import type { Mode } from "../types.js";
import { runElevatedGlideRecordWrite } from "../utils.js";

function errorResult(error: unknown) {
  const message =
    error instanceof ServiceNowApiError
      ? `ServiceNow API Error (${error.statusCode}): ${error.detail}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

export function registerConfigItemTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // ========== ACLs ==========

  // sn_acl_list — Both modes
  server.tool(
    "sn_acl_list",
    "List ACLs, optionally filtered by table, operation, or type",
    {
      table: z.string().optional().describe("Filter ACLs by table name"),
      operation: z
        .enum(["read", "write", "create", "delete"])
        .optional()
        .describe("Filter by operation type"),
      type: z.string().optional().describe("Filter by ACL type (e.g. 'record')"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ table, operation, type, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`nameLIKE${table}`);
        if (operation) queryParts.push(`operation=${operation}`);
        if (type) queryParts.push(`type=${type}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_security_acl", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,name,operation,type,active,condition,script,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalCount: result.totalCount,
                  count: result.records.length,
                  records: result.records,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_acl_get — Both modes
  server.tool(
    "sn_acl_get",
    "Get full ACL details by sys_id, including script and condition",
    {
      sys_id: z.string().describe("The sys_id of the ACL"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_security_acl", sys_id);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== UI Policies ==========

  // sn_ui_policy_list — Both modes
  server.tool(
    "sn_ui_policy_list",
    "List UI Policies, optionally filtered by table or active status",
    {
      table: z.string().optional().describe("Filter by table name"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ table, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`table=${table}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYorder");

        const result = await client.query("sys_ui_policy", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,short_description,table,active,order,on_load,reverse_if_false,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalCount: result.totalCount,
                  count: result.records.length,
                  records: result.records,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_ui_policy_get — Both modes
  server.tool(
    "sn_ui_policy_get",
    "Get a UI Policy by sys_id, including its associated UI Policy Actions",
    {
      sys_id: z.string().describe("The sys_id of the UI Policy"),
    },
    async ({ sys_id }) => {
      try {
        const policy = await client.getById("sys_ui_policy", sys_id);

        // Also fetch associated UI Policy Actions
        const actions = await client.query("sys_ui_policy_action", {
          sysparm_query: `ui_policy=${sys_id}`,
          sysparm_fields:
            "sys_id,field,visible,mandatory,disabled,ui_policy",
          sysparm_limit: 50,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { policy, actions: actions.records },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_ui_policy_actions — Both modes
  server.tool(
    "sn_ui_policy_actions",
    "List UI Policy Actions for a given UI Policy sys_id (field visibility, mandatory, read-only settings)",
    {
      ui_policy_sys_id: z
        .string()
        .describe("The sys_id of the parent UI Policy"),
    },
    async ({ ui_policy_sys_id }) => {
      try {
        const result = await client.query("sys_ui_policy_action", {
          sysparm_query: `ui_policy=${ui_policy_sys_id}`,
          sysparm_fields:
            "sys_id,field,visible,mandatory,disabled,ui_policy",
          sysparm_limit: 50,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  uiPolicySysId: ui_policy_sys_id,
                  count: result.records.length,
                  actions: result.records,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== UI Actions ==========

  // sn_ui_action_list — Both modes
  server.tool(
    "sn_ui_action_list",
    "List UI Actions (buttons, links, context menus) filtered by table",
    {
      table: z.string().optional().describe("Filter by table name"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ table, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`table=${table}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYorder");

        const result = await client.query("sys_ui_action", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,name,table,action_name,active,order,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalCount: result.totalCount,
                  count: result.records.length,
                  records: result.records,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_ui_action_get — Both modes
  server.tool(
    "sn_ui_action_get",
    "Get full UI Action details including script and conditions",
    {
      sys_id: z.string().describe("The sys_id of the UI Action"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_ui_action", sys_id);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Develop-only tools ==========
  if (mode !== "develop") return;

  // sn_acl_create — Develop only. Always self-elevates to security_admin;
  // the platform refuses ACL writes without it, REST or otherwise, so this
  // routes through the background-script engine instead of the plain Table
  // API every other create tool in this server uses.
  server.tool(
    "sn_acl_create",
    "Create a new Access Control (sys_security_acl). Automatically self-elevates to security_admin for this write (see the Role Elevation section in the README) — this only works if the SERVICENOW_USERNAME account already holds security_admin directly; it cannot grant the role.",
    {
      data: z
        .record(z.unknown())
        .describe(
          "Field-value pairs for the new ACL (typically 'name' (table or table.field), 'operation' " +
          "(read/write/create/delete), 'type' (record/field), 'active', 'admin_overrides', 'script', 'condition', 'roles')"
        ),
    },
    async ({ data }) => {
      const script = [
        `var data = ${JSON.stringify(data)};`,
        "var gr = new GlideRecord('sys_security_acl');",
        "gr.initialize();",
        "for (var key in data) { gr.setValue(key, data[key]); }",
        "var sysId = gr.insert();",
        "if (!sysId) {",
        "  gs.print(JSON.stringify({ error: true, message: 'ACL insert failed', lastError: gr.getLastErrorMessage ? gr.getLastErrorMessage() : null }));",
        "} else {",
        "  var out = { sys_id: sysId };",
        "  for (var k in data) { out[k] = gr.getValue(k); }",
        "  gs.print(JSON.stringify(out));",
        "}",
      ].join("\n");

      return runElevatedGlideRecordWrite(client, script);
    }
  );

  // sn_acl_update — Develop only. Always self-elevates to security_admin.
  server.tool(
    "sn_acl_update",
    "Update an existing Access Control (sys_security_acl). Automatically self-elevates to security_admin for this write — this only works if the SERVICENOW_USERNAME account already holds security_admin directly; it cannot grant the role.",
    {
      sys_id: z.string().describe("The sys_id of the ACL to update"),
      data: z.record(z.unknown()).describe("Field-value pairs to update"),
    },
    async ({ sys_id, data }) => {
      const script = [
        `var sysId = ${JSON.stringify(sys_id)};`,
        `var data = ${JSON.stringify(data)};`,
        "var gr = new GlideRecord('sys_security_acl');",
        "if (!gr.get(sysId)) {",
        "  gs.print(JSON.stringify({ error: true, message: 'ACL not found: ' + sysId }));",
        "} else {",
        "  for (var key in data) { gr.setValue(key, data[key]); }",
        "  gr.update();",
        "  var out = { sys_id: sysId };",
        "  for (var k in data) { out[k] = gr.getValue(k); }",
        "  gs.print(JSON.stringify(out));",
        "}",
      ].join("\n");

      return runElevatedGlideRecordWrite(client, script);
    }
  );

  // sn_ui_policy_create — Develop only
  server.tool(
    "sn_ui_policy_create",
    "Create a new UI Policy",
    {
      data: z
        .record(z.unknown())
        .describe("Field-value pairs for the new UI Policy"),
    },
    async ({ data }) => {
      try {
        const record = await client.create("sys_ui_policy", data);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_ui_policy_update — Develop only
  server.tool(
    "sn_ui_policy_update",
    "Update an existing UI Policy",
    {
      sys_id: z.string().describe("The sys_id of the UI Policy to update"),
      data: z
        .record(z.unknown())
        .describe("Field-value pairs to update"),
    },
    async ({ sys_id, data }) => {
      try {
        const record = await client.update("sys_ui_policy", sys_id, data);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
