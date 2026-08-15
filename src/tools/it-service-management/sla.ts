import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";

export function registerSlaTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_sla_definition_list",
    "List SLA definitions (contract_sla). Shows SLA name, table, duration, and conditions.",
    {
      table: z.string().optional().describe("Filter by table name, e.g. 'incident'"),
      name: z.string().optional().describe("Filter by SLA name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ table, name, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`collection=${table}`);
        if (name) queryParts.push(`nameLIKE${name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("contract_sla", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,collection,duration,active,start_condition,stop_condition,pause_condition,retroactive,sys_updated_on",
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
    "sn_sla_definition_get",
    "Get full SLA definition details",
    {
      sys_id: z.string().describe("The sys_id of the SLA definition"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("contract_sla", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_task_sla_list",
    "List task SLA records (task_sla) — active SLA tracking instances attached to records. Shows actual SLA timers, their stage (in_progress, paused, breached), and timing details.",
    {
      task: z.string().optional().describe("Filter by task sys_id"),
      sla: z.string().optional().describe("Filter by SLA definition sys_id"),
      stage: z.enum(["in_progress", "paused", "cancelled", "achieved", "breached"]).optional().describe("Filter by SLA stage"),
      has_breached: z.boolean().optional().describe("Filter by breached status"),
      table: z.string().optional().describe("Filter by task table name"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ task, sla, stage, has_breached, table, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (task) queryParts.push(`task=${task}`);
        if (sla) queryParts.push(`sla=${sla}`);
        if (stage) queryParts.push(`stage=${stage}`);
        if (has_breached !== undefined) queryParts.push(`has_breached=${has_breached}`);
        if (table) queryParts.push(`task.sys_class_name=${table}`);
        queryParts.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("task_sla", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,task,sla,stage,has_breached,start_time,end_time,pause_time,pause_duration,business_pause_duration,percentage,sys_updated_on",
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
}
