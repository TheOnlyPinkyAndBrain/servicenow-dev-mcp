import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Requires the On-Call Scheduling plugin (com.snc.on_call_rotation).
export function registerOnCallTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_oncall_rota_list",
    "List on-call rotations (cmn_rota) — recurring on-call schedules attached to assignment groups. Requires the On-Call Scheduling plugin.",
    {
      group: z.string().optional().describe("Filter by assignment group name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ group, active, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (group) queryParts.push(`group.nameLIKE${group}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");
        const result = await client.query("cmn_rota", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,group,active,state,schedule,coverage_interval,sys_updated_on",
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
    "sn_oncall_member_list",
    "List on-call rotation members (cmn_rota_member) — the users assigned into an on-call rotation's rosters. Requires the On-Call Scheduling plugin.",
    {
      member: z.string().optional().describe("Filter by member user sys_id"),
      query: z.string().optional().describe("Additional encoded query (e.g. dot-walk to the rota/roster)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ member, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (member) queryParts.push(`member=${member}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYorder");
        const result = await client.query("cmn_rota_member", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,member,roster,order,from,to,rotation_schedule,sys_updated_on",
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
}
