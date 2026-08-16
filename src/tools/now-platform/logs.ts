import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import { ServiceNowApiError } from "../../client.js";
import type { Mode } from "../../types.js";
import { READ } from "../../annotations.js";

function errorResult(error: unknown) {
  const message =
    error instanceof ServiceNowApiError
      ? `ServiceNow API Error (${error.statusCode}): ${error.detail}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

export function registerLogTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  // sn_logs_query — Both modes
  server.tool(
    "sn_logs_query",
    "Query system logs (syslog) — filter by level, source, message text, and time range",
    {
      level: z
        .enum(["error", "warning", "info", "debug"])
        .optional()
        .describe("Log level to filter by"),
      source: z.string().optional().describe("Source script or module name"),
      message: z.string().optional().describe("Text to search for in log messages"),
      start_time: z
        .string()
        .optional()
        .describe("Start of time range, e.g. '2024-01-01 00:00:00'"),
      end_time: z
        .string()
        .optional()
        .describe("End of time range, e.g. '2024-01-02 00:00:00'"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ level, source, message, start_time, end_time, limit }) => {
      try {
        const queryParts: string[] = [];
        if (level) {
          const levelMap: Record<string, string> = {
            error: "0",
            warning: "1",
            info: "2",
            debug: "3",
          };
          queryParts.push(`level=${levelMap[level]}`);
        }
        if (source) queryParts.push(`sourceLIKE${source}`);
        if (message) queryParts.push(`messageLIKE${message}`);
        if (start_time) queryParts.push(`sys_created_on>=${start_time}`);
        if (end_time) queryParts.push(`sys_created_on<=${end_time}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("syslog", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,level,source,message,sys_created_on,sys_created_by",
          sysparm_limit: limit ?? 20,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalCount: result.totalCount,
                  count: result.records.length,
                  records: result.records,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_logs_get_transactions — Both modes
  server.tool(
    "sn_logs_get_transactions",
    "Query transaction logs — filter by URL, status, and time range",
    {
      url: z.string().optional().describe("URL pattern to filter by (contains match)"),
      status: z.string().optional().describe("HTTP status code to filter by"),
      start_time: z
        .string()
        .optional()
        .describe("Start of time range, e.g. '2024-01-01 00:00:00'"),
      end_time: z
        .string()
        .optional()
        .describe("End of time range, e.g. '2024-01-02 00:00:00'"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ url, status, start_time, end_time, limit }) => {
      try {
        const queryParts: string[] = [];
        if (url) queryParts.push(`urlLIKE${url}`);
        if (status) queryParts.push(`status=${status}`);
        if (start_time) queryParts.push(`sys_created_on>=${start_time}`);
        if (end_time) queryParts.push(`sys_created_on<=${end_time}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("syslog_transaction", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,url,status,response_time,sys_created_on,sys_created_by",
          sysparm_limit: limit ?? 20,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalCount: result.totalCount,
                  count: result.records.length,
                  records: result.records,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
