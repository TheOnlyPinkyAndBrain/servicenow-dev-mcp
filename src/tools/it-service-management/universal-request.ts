import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Requires the Universal Request plugin (com.snc.universal_request).
export function registerUniversalRequestTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_universal_request_list",
    "List Universal Requests (universal_request) — the single front-door request record that routes an employee's issue to the right department (IT, HR, etc.). Requires the Universal Request plugin.",
    {
      requested_for: z.string().optional().describe("Filter by requested_for user sys_id"),
      state: z.string().optional().describe("Filter by state"),
      assignment_group: z.string().optional().describe("Filter by assignment group name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ requested_for, state, assignment_group, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (requested_for) queryParts.push(`requested_for=${requested_for}`);
        if (state) queryParts.push(`state=${state}`);
        if (assignment_group) queryParts.push(`assignment_group.nameLIKE${assignment_group}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");
        const result = await client.query("universal_request", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,requested_for,opened_by,assignment_group,assigned_to,sys_created_on,sys_updated_on",
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
}
