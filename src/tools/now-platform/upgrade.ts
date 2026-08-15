import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerUpgradeTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_upgrade_history",
    "List upgrade/patch history (sys_upgrade_history) — all upgrades and patches applied to this instance",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ limit, offset }) => {
      try {
        const result = await client.query("sys_upgrade_history", {
          sysparm_query: "ORDERBYDESCupgrade_started",
          sysparm_fields: "sys_id,from_version,to_version,upgrade_started,upgrade_finished,upgrade_type,state,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_upgrade_skipped_list",
    "List skipped upgrade records — customized records that were skipped during upgrade. These are high-priority items to review.",
    {
      upgrade_history: z.string().optional().describe("Upgrade history sys_id to filter by specific upgrade"),
      type: z.string().optional().describe("Record type (e.g., sys_script, sys_ui_action, sysevent_email_action)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ upgrade_history, type, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (upgrade_history) qp.push(`upgrade_history=${upgrade_history}`);
        if (type) qp.push(`typeLIKE${type}`);
        qp.push("ORDERBYtype");

        const result = await client.query("sys_upgrade_history_log", {
          sysparm_query: `type!=NULL^${qp.join("^")}`,
          sysparm_fields: "sys_id,file_name,type,target_name,disposition,upgrade_history,sys_created_on",
          sysparm_limit: limit ?? 50,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_upgrade_customized_records",
    "List records customized from baseline (sys_update_xml where customer update is true) — shows what has been modified from out-of-box",
    {
      type: z.string().optional().describe("Record type/table (e.g., sys_script, sys_ui_action)"),
      name: z.string().optional().describe("Record name (contains match)"),
      category: z.string().optional().describe("Category filter"),
      updated_after: z.string().optional().describe("Updated after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ type, name, category, updated_after, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (type) qp.push(`type=${type}`);
        if (name) qp.push(`nameLIKE${name}`);
        if (category) qp.push(`category=${category}`);
        if (updated_after) qp.push(`sys_updated_on>=${updated_after}`);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_update_xml", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,type,target_name,category,update_set,sys_created_by,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_upgrade_impact_summary",
    "Get a summary of upgrade impact — counts of skipped records by type for a given upgrade",
    {
      upgrade_history: z.string().describe("Upgrade history sys_id"),
    },
    READ,
    async ({ upgrade_history }) => {
      try {
        const summary = await client.aggregate("sys_upgrade_history_log", {
          sysparm_query: `upgrade_history=${upgrade_history}`,
          sysparm_group_by: "type",
          sysparm_count: true,
        });
        return jsonResult({ summary });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
