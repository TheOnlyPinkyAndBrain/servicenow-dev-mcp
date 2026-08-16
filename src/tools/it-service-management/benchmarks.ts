import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Benchmarks — peer-comparison KPI indicators and recommendations.
// Requires the Benchmarks plugin/spoke (com.sn_bm_client.spoke).
export function registerBenchmarkTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_benchmark_indicator_list",
    "List benchmark indicators (sn_bm_common_indicator) — the KPIs measured for peer benchmarking (e.g. MTTR, reopen rate). Requires the Benchmarks plugin.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      category: z.string().optional().describe("Filter by indicator category"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, category, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (category) queryParts.push(`category=${category}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");
        const result = await client.query("sn_bm_common_indicator", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,indicator,category,group,aggregation,active,sys_updated_on",
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
    "sn_benchmark_recommendation_list",
    "List benchmark recommendations (sn_bm_client_recommendation) — improvement suggestions tied to a benchmark indicator and threshold. Requires the Benchmarks plugin.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      indicator: z.string().optional().describe("Filter by related indicator sys_id"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, indicator, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (indicator) queryParts.push(`indicator=${indicator}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");
        const result = await client.query("sn_bm_client_recommendation", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,name,indicator,type,threshold_value,direction,table,active,sys_updated_on",
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
