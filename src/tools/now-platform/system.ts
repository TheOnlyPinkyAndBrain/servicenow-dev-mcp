import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";

export function registerSystemTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // ========== System Properties ==========

  server.tool(
    "sn_sys_property_list",
    "List or search system properties (sys_properties). System properties control instance-wide behavior and configuration.",
    {
      name: z.string().optional().describe("Filter by property name (contains match), e.g. 'glide.ui'"),
      description: z.string().optional().describe("Filter by description (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, description, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (description) queryParts.push(`descriptionLIKE${description}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_properties", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,value,description,type,sys_scope,suffix",
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

  server.tool(
    "sn_sys_property_get",
    "Get a system property value by exact name",
    {
      name: z.string().describe("Exact property name, e.g. 'glide.ui.list.edit'"),
    },
    async ({ name }) => {
      try {
        const result = await client.query("sys_properties", {
          sysparm_query: `name=${name}`,
          sysparm_fields: "sys_id,name,value,description,type,sys_scope,suffix",
          sysparm_display_value: "true",
          sysparm_limit: 1,
        });

        if (result.records.length === 0) {
          return jsonResult({ error: `Property '${name}' not found` });
        }
        return jsonResult(result.records[0]);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Scheduled Jobs ==========

  server.tool(
    "sn_sys_trigger_list",
    "List scheduled job triggers (sys_trigger). Shows job name, next action time, state, trigger type. Useful for debugging timing-related issues. For scheduled job definitions see sn_scheduled_job_list.",
    {
      name: z.string().optional().describe("Filter by job name (contains match)"),
      state: z.enum(["0", "1", "2"]).optional().describe("Filter by state: 0=Ready, 1=Processing, 2=Complete"),
      trigger_type: z.enum(["0", "1", "2", "3", "7", "8"]).optional().describe("0=Run Once, 1=Daily, 2=Weekly, 3=Monthly, 7=Run at, 8=On Demand"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, state, trigger_type, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (state) queryParts.push(`state=${state}`);
        if (trigger_type) queryParts.push(`trigger_type=${trigger_type}`);
        queryParts.push("ORDERBYnext_action");

        const result = await client.query("sys_trigger", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,next_action,state,trigger_type,system_id,document,document_key,claimed_by,sys_updated_on",
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

  server.tool(
    "sn_sys_trigger_get",
    "Get full scheduled job trigger details by sys_id (sys_trigger)",
    {
      sys_id: z.string().describe("The sys_id of the scheduled job"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_trigger", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Application Scopes ==========

  server.tool(
    "sn_app_list",
    "List application scopes (sys_scope). Shows custom and store apps installed on the instance.",
    {
      name: z.string().optional().describe("Filter by app name (contains match)"),
      scope: z.string().optional().describe("Filter by scope namespace (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, scope, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (scope) queryParts.push(`scopeLIKE${scope}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_scope", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,scope,short_description,active,version,vendor,licensable,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
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

  server.tool(
    "sn_app_get",
    "Get full application scope details by sys_id",
    {
      sys_id: z.string().describe("The sys_id of the application scope"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_scope", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_app_modules",
    "List application modules (navigation menu items) for an application or scope. Useful for understanding app navigation structure.",
    {
      application: z.string().optional().describe("Filter by application sys_id or name"),
      title: z.string().optional().describe("Filter by module title (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ application, title, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (application) queryParts.push(`application.nameLIKE${application}`);
        if (title) queryParts.push(`titleLIKE${title}`);
        queryParts.push("ORDERBYorder");

        const result = await client.query("sys_app_module", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,title,application,link_type,table_name,filter,order,active,roles",
          sysparm_limit: limit ?? 50,
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

  // ========== Aggregate Stats ==========

  server.tool(
    "sn_aggregate",
    "Get aggregate statistics (count, sum, avg, min, max) for any table. Useful for dashboards, diagnostics, and understanding data distribution without pulling individual records.",
    {
      table: z.string().describe("Table name, e.g. 'incident'"),
      query: z.string().optional().describe("Encoded query to filter records"),
      group_by: z.string().optional().describe("Field to group results by, e.g. 'priority', 'state'"),
      count: z.boolean().optional().describe("Include record count (default true)"),
      avg_fields: z.string().optional().describe("Comma-separated fields to average"),
      sum_fields: z.string().optional().describe("Comma-separated fields to sum"),
      min_fields: z.string().optional().describe("Comma-separated fields to get minimums"),
      max_fields: z.string().optional().describe("Comma-separated fields to get maximums"),
    },
    async ({ table, query, group_by, count, avg_fields, sum_fields, min_fields, max_fields }) => {
      try {
        const result = await client.aggregate(table, {
          sysparm_query: query,
          sysparm_group_by: group_by,
          sysparm_count: count !== false,
          sysparm_avg_fields: avg_fields,
          sysparm_sum_fields: sum_fields,
          sysparm_min_fields: min_fields,
          sysparm_max_fields: max_fields,
        });

        return jsonResult({ table, result });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== sys_metadata / impact analysis ==========

  server.tool(
    "sn_table_impact",
    "Analyze what customizations affect a table — lists all business rules, client scripts, UI policies, UI actions, ACLs, and script includes related to a specific table. Essential for debugging why a form/table behaves a certain way.",
    {
      table: z.string().describe("Table name to analyze, e.g. 'incident'"),
      active_only: z.boolean().optional().describe("Only show active customizations (default true)"),
    },
    async ({ table, active_only }) => {
      try {
        const activeFilter = active_only !== false ? "^active=true" : "";

        const [businessRules, clientScripts, uiPolicies, uiActions, acls] = await Promise.all([
          client.query("sys_script", {
            sysparm_query: `collection=${table}${activeFilter}^ORDERBYorder`,
            sysparm_fields: "sys_id,name,when,order,active",
            sysparm_limit: 50,
          }),
          client.query("sys_ui_client_script", {
            sysparm_query: `table=${table}${activeFilter}^ORDERBYorder`,
            sysparm_fields: "sys_id,name,type,ui_type,active",
            sysparm_limit: 50,
          }),
          client.query("sys_ui_policy", {
            sysparm_query: `table=${table}${activeFilter}^ORDERBYorder`,
            sysparm_fields: "sys_id,short_description,order,active",
            sysparm_limit: 50,
          }),
          client.query("sys_ui_action", {
            sysparm_query: `table=${table}${activeFilter}^ORDERBYorder`,
            sysparm_fields: "sys_id,name,action_name,order,active",
            sysparm_limit: 50,
          }),
          client.query("sys_security_acl", {
            sysparm_query: `nameLIKE${table}${activeFilter}^ORDERBYname`,
            sysparm_fields: "sys_id,name,operation,type,active",
            sysparm_limit: 50,
          }),
        ]);

        return jsonResult({
          table,
          businessRules: { count: businessRules.totalCount, records: businessRules.records },
          clientScripts: { count: clientScripts.totalCount, records: clientScripts.records },
          uiPolicies: { count: uiPolicies.totalCount, records: uiPolicies.records },
          uiActions: { count: uiActions.totalCount, records: uiActions.records },
          acls: { count: acls.totalCount, records: acls.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Develop-only system tools ==========
  if (mode !== "develop") return;

  server.tool(
    "sn_sys_property_set",
    "Set a system property value. Creates the property if it doesn't exist.",
    {
      name: z.string().describe("Property name"),
      value: z.string().describe("Property value to set"),
      description: z.string().optional().describe("Property description (only used when creating)"),
      type: z.enum(["string", "integer", "boolean", "choicelist"]).optional().describe("Property type (only used when creating)"),
    },
    async ({ name, value, description, type }) => {
      try {
        // Check if property exists
        const existing = await client.query("sys_properties", {
          sysparm_query: `name=${name}`,
          sysparm_fields: "sys_id",
          sysparm_limit: 1,
        });

        if (existing.records.length > 0) {
          const rec = existing.records[0] as { sys_id: string };
          const updated = await client.update("sys_properties", rec.sys_id, { value });
          return jsonResult(updated);
        } else {
          const data: Record<string, unknown> = { name, value };
          if (description) data.description = description;
          if (type) data.type = type;
          const created = await client.create("sys_properties", data);
          return jsonResult(created);
        }
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
