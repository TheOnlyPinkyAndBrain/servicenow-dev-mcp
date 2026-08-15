import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import { ServiceNowApiError } from "../../client.js";
import type { Mode } from "../../types.js";
import { CREATE, DELETE, READ, UPDATE } from "../../annotations.js";
import { jsonResult } from "../../utils.js";

function errorResult(error: unknown) {
  const message =
    error instanceof ServiceNowApiError
      ? `ServiceNow API Error (${error.statusCode}): ${error.detail}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

export function registerTableTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // sn_table_query — Both modes
  server.tool(
    "sn_table_query",
    "Query records from any ServiceNow table with filters, pagination, and field selection",
    {
      table: z.string().describe("Table name, e.g. 'incident', 'sys_user'"),
      query: z.string().optional().describe("Encoded query string, e.g. 'active=true^priority=1'"),
      fields: z.string().optional().describe("Comma-separated field names to return"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records to return (default 20, max 100)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table, query, fields, limit, offset }) => {
      try {
        const result = await client.query(table, {
          sysparm_query: query,
          sysparm_fields: fields,
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalCount: result.totalCount,
                  limit: result.limit,
                  offset: result.offset,
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

  // sn_table_get — Both modes
  server.tool(
    "sn_table_get",
    "Get a single record from any ServiceNow table by sys_id",
    {
      table: z.string().describe("Table name"),
      sys_id: z.string().describe("The sys_id of the record"),
      fields: z.string().optional().describe("Comma-separated field names to return"),
    },
    READ,
    async ({ table, sys_id, fields }) => {
      try {
        const record = await client.getById(table, sys_id, fields);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_archive_rule_list",
    "List table archive rules (sys_archive) — rules that move aged records off active tables, with their condition, schedule, and estimated volume.",
    {
      table: z.string().optional().describe("Filter by table name"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`table=${table}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");
        const result = await client.query("sys_archive", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,table,condition,active,last_run_date,next_run_date,total,retain_references,sys_updated_on",
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

  if (mode !== "develop") return;

  // sn_table_create — Develop only
  server.tool(
    "sn_table_create",
    "Create a new record in any ServiceNow table",
    {
      table: z.string().describe("Table name"),
      data: z
        .record(z.string(), z.unknown())
        .describe("Field-value pairs for the new record"),
    },
    CREATE,
    async ({ table, data }) => {
      try {
        const record = await client.create(table, data);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_table_update — Develop only
  server.tool(
    "sn_table_update",
    "Update a record in any ServiceNow table by sys_id",
    {
      table: z.string().describe("Table name"),
      sys_id: z.string().describe("The sys_id of the record to update"),
      data: z
        .record(z.string(), z.unknown())
        .describe("Field-value pairs to update"),
    },
    UPDATE,
    async ({ table, sys_id, data }) => {
      try {
        const record = await client.update(table, sys_id, data);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_table_delete — Develop only
  server.tool(
    "sn_table_delete",
    "Delete a record from any ServiceNow table by sys_id (destructive)",
    {
      table: z.string().describe("Table name"),
      sys_id: z.string().describe("The sys_id of the record to delete"),
    },
    DELETE,
    async ({ table, sys_id }) => {
      try {
        await client.delete(table, sys_id);
        return {
          content: [
            { type: "text", text: `Record ${sys_id} deleted from ${table}.` },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
