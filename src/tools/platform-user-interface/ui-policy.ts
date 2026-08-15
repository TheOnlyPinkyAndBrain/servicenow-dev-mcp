import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

// UI Policies and UI Actions — client-side form configuration.
export function registerUiConfigTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_ui_policy_list",
    "List UI Policies (sys_ui_policy), optionally filtered by table or active status",
    {
      table: z.string().optional().describe("Filter by table name"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`table=${table}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYorder");
        const result = await client.query("sys_ui_policy", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,short_description,table,active,order,on_load,reverse_if_false,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_ui_policy_get",
    "Get a UI Policy by sys_id, including its associated UI Policy Actions",
    {
      sys_id: z.string().describe("The sys_id of the UI Policy"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [policy, actions] = await Promise.all([
          client.getById("sys_ui_policy", sys_id),
          client.query("sys_ui_policy_action", {
            sysparm_query: `ui_policy=${sys_id}`,
            sysparm_fields: "sys_id,field,visible,mandatory,disabled,ui_policy",
            sysparm_limit: 50,
          }),
        ]);
        return jsonResult({ policy, actions: actions.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_ui_policy_actions",
    "List UI Policy Actions (sys_ui_policy_action) for a UI Policy — field visibility, mandatory, and read-only settings",
    {
      ui_policy_sys_id: z.string().describe("The sys_id of the parent UI Policy"),
    },
    READ,
    async ({ ui_policy_sys_id }) => {
      try {
        const result = await client.query("sys_ui_policy_action", {
          sysparm_query: `ui_policy=${ui_policy_sys_id}`,
          sysparm_fields: "sys_id,field,visible,mandatory,disabled,ui_policy",
          sysparm_limit: 50,
        });
        return jsonResult({ uiPolicySysId: ui_policy_sys_id, count: result.records.length, actions: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_ui_action_list",
    "List UI Actions (sys_ui_action) — buttons, links, context menus — filtered by table",
    {
      table: z.string().optional().describe("Filter by table name"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`table=${table}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYorder");
        const result = await client.query("sys_ui_action", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,table,action_name,active,order,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_ui_action_get",
    "Get full UI Action details (sys_ui_action) including script and conditions",
    {
      sys_id: z.string().describe("The sys_id of the UI Action"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_ui_action", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_ui_policy_create",
    "Create a new UI Policy (sys_ui_policy)",
    {
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs for the new UI Policy"),
    },
    CREATE,
    async ({ data }) => {
      try {
        const record = await client.create("sys_ui_policy", data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_ui_policy_update",
    "Update an existing UI Policy (sys_ui_policy)",
    {
      sys_id: z.string().describe("The sys_id of the UI Policy to update"),
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs to update"),
    },
    UPDATE,
    async ({ sys_id, data }) => {
      try {
        const record = await client.update("sys_ui_policy", sys_id, data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
