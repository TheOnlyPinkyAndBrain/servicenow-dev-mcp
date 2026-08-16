import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { DELETE, READ } from "../../annotations.js";

export function registerAttachmentTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_attachment_list",
    "List attachments for a specific record or table. Returns metadata including file name, size, content type.",
    {
      table_name: z.string().describe("Table name (e.g., 'incident', 'change_request')"),
      table_sys_id: z.string().optional().describe("Record sys_id to list attachments for a specific record"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table_name, table_sys_id, limit, offset }) => {
      try {
        const result = await client.attachmentQuery(table_name, table_sys_id, {
          sysparm_limit: limit ?? 20,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_attachment_get",
    "Get attachment metadata by sys_id (file name, content type, size, table info)",
    {
      sys_id: z.string().describe("Attachment sys_id"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const result = await client.attachmentGetById(sys_id);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_attachment_search",
    "Search attachments by file name, content type, or size across all tables",
    {
      file_name: z.string().optional().describe("File name (contains match)"),
      content_type: z.string().optional().describe("Content type (e.g., 'application/pdf', 'image/png')"),
      table_name: z.string().optional().describe("Filter by source table"),
      min_size: z.coerce.number().optional().describe("Minimum file size in bytes"),
      max_size: z.coerce.number().optional().describe("Maximum file size in bytes"),
      created_after: z.string().optional().describe("Created after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ file_name, content_type, table_name, min_size, max_size, created_after, limit }) => {
      try {
        const qp: string[] = [];
        if (file_name) qp.push(`file_nameLIKE${file_name}`);
        if (content_type) qp.push(`content_typeLIKE${content_type}`);
        if (table_name) qp.push(`table_name=${table_name}`);
        if (min_size) qp.push(`size_bytes>=${min_size}`);
        if (max_size) qp.push(`size_bytes<=${max_size}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_attachment", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,file_name,content_type,size_bytes,table_name,table_sys_id,sys_created_on,sys_created_by",
          sysparm_limit: limit,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_attachment_delete",
    "Delete an attachment by sys_id",
    {
      sys_id: z.string().describe("Attachment sys_id to delete"),
    },
    DELETE,
    async ({ sys_id }) => {
      try {
        await client.attachmentDelete(sys_id);
        return jsonResult({ success: true, message: "Attachment deleted" });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
