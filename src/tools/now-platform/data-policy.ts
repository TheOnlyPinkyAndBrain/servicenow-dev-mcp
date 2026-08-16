import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerDataPolicyTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_data_policy_list",
    "List data policies (sys_data_policy2). Data policies enforce mandatory and read-only rules server-side — they apply even via API and import sets, unlike UI policies. A common source of 'mandatory field' errors when creating/updating records via web services.",
    {
      table: z.string().optional().describe("Filter by table name, e.g. 'incident'"),
      active: z.boolean().optional().describe("Filter by active status"),
      apply_soap: z.boolean().optional().describe("Filter by whether it applies to web service API calls"),
      apply_import_set: z.boolean().optional().describe("Filter by whether it applies to import sets"),
      enforce_ui: z.boolean().optional().describe("Filter by whether it also acts as a UI policy on the client"),
      short_description: z.string().optional().describe("Filter by description (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table, active, apply_soap, apply_import_set, enforce_ui, short_description, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`model_table=${table}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (apply_soap !== undefined) queryParts.push(`apply_soap=${apply_soap}`);
        if (apply_import_set !== undefined) queryParts.push(`apply_import_set=${apply_import_set}`);
        if (enforce_ui !== undefined) queryParts.push(`enforce_ui=${enforce_ui}`);
        if (short_description) queryParts.push(`short_descriptionLIKE${short_description}`);
        queryParts.push("ORDERBYmodel_table");

        const result = await client.query("sys_data_policy2", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,model_table,short_description,active,conditions,apply_import_set,apply_soap,enforce_ui,inherit,reverse_if_false,sys_updated_on",
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
    "sn_data_policy_get",
    "Get a data policy by sys_id with all its field rules. Shows the policy conditions, which fields are mandatory or read-only, and where it applies (API, import sets, UI).",
    {
      sys_id: z.string().describe("The sys_id of the data policy"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [policy, rules] = await Promise.all([
          client.getById("sys_data_policy2", sys_id),
          client.query("sys_data_policy_rule", {
            sysparm_query: `sys_data_policy=${sys_id}^ORDERBYfield`,
            sysparm_fields: "sys_id,field,table,mandatory,disabled",
            sysparm_limit: 100,
          }),
        ]);

        return jsonResult({
          policy,
          rules: rules.records,
          ruleCount: rules.totalCount,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_data_policy_rules",
    "List data policy rules (field-level enforcement) for a data policy. Shows which fields are set as mandatory or disabled/read-only by the policy.",
    {
      data_policy_sys_id: z.string().describe("The sys_id of the parent data policy"),
    },
    READ,
    async ({ data_policy_sys_id }) => {
      try {
        const result = await client.query("sys_data_policy_rule", {
          sysparm_query: `sys_data_policy=${data_policy_sys_id}^ORDERBYfield`,
          sysparm_fields: "sys_id,field,table,mandatory,disabled,sys_data_policy",
          sysparm_limit: 100,
        });

        return jsonResult({
          dataPolicySysId: data_policy_sys_id,
          count: result.records.length,
          rules: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_data_policy_for_table",
    "Find all active data policies and their rules for a specific table. Essential for debugging 'mandatory field' or 'read-only' errors when creating/updating records via API, import sets, or the UI. Returns policies with their conditions and field rules in one call.",
    {
      table: z.string().describe("Table name, e.g. 'incident'"),
      api_only: z.boolean().optional().describe("Only show policies that apply to web service API calls (default false)"),
    },
    READ,
    async ({ table, api_only }) => {
      try {
        const queryParts = [`model_table=${table}`, "active=true"];
        if (api_only) queryParts.push("apply_soap=true");
        queryParts.push("ORDERBYshort_description");

        const policies = await client.query("sys_data_policy2", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,model_table,short_description,conditions,apply_import_set,apply_soap,enforce_ui,reverse_if_false",
          sysparm_limit: 50,
          sysparm_display_value: "true",
        });

        // Fetch rules for all policies in parallel
        const policiesWithRules = await Promise.all(
          (policies.records as Array<Record<string, unknown>>).map(async (policy) => {
            const rules = await client.query("sys_data_policy_rule", {
              sysparm_query: `sys_data_policy=${policy.sys_id}^ORDERBYfield`,
              sysparm_fields: "sys_id,field,mandatory,disabled",
              sysparm_limit: 50,
            });
            return {
              ...policy,
              rules: rules.records,
            };
          })
        );

        return jsonResult({
          table,
          totalPolicies: policies.totalCount,
          policies: policiesWithRules,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
