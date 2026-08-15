import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Outage Management — CI outages (cmdb_ci_outage) linked to incidents/changes.
export function registerOutageTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_outage_list",
    "List outages (cmdb_ci_outage) — recorded CI outages/degradations with begin/end windows, optionally tied to an incident or change.",
    {
      cmdb_ci: z.string().optional().describe("Filter by affected CI sys_id"),
      type: z.string().optional().describe("Filter by outage type (e.g. 'Outage', 'Degradation', 'Planned')"),
      task_number: z.string().optional().describe("Filter by the related task number (incident/change)"),
      query: z.string().optional().describe("Additional encoded query (e.g. 'begin>=2026-01-01 00:00:00')"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ cmdb_ci, type, task_number, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (cmdb_ci) queryParts.push(`cmdb_ci=${cmdb_ci}`);
        if (type) queryParts.push(`type=${type}`);
        if (task_number) queryParts.push(`task_number=${task_number}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCbegin");
        const result = await client.query("cmdb_ci_outage", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,type,cmdb_ci,task_number,begin,end,duration,short_description",
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
    "sn_outage_get",
    "Get full outage details (cmdb_ci_outage) by sys_id, including the outage message and details.",
    {
      sys_id: z.string().describe("The sys_id of the outage record"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("cmdb_ci_outage", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
