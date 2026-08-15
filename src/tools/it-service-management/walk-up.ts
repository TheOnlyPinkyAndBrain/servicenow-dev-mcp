import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Requires the Walk-Up Experience plugin (com.snc.walkup).
export function registerWalkUpTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_walkup_queue_list",
    "List Walk-Up Experience location queues (wu_location_queue) — the queues configured for walk-up support locations. Requires the Walk-Up Experience plugin. (Walk-up visitor sessions themselves are stored as interaction records.)",
    {
      location: z.string().optional().describe("Filter by location name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ location, active, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (location) queryParts.push(`location.nameLIKE${location}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYnumber");
        const result = await client.query("wu_location_queue", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,location,queue,active,sys_updated_on",
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
