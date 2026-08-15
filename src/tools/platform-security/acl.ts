import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

export function registerAclTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_acl_list",
    "List ACLs (sys_security_acl), optionally filtered by table, operation, or type",
    {
      table: z.string().optional().describe("Filter ACLs by name (contains match, often the table)"),
      operation: z.enum(["read", "write", "create", "delete"]).optional().describe("Filter by operation type"),
      type: z.string().optional().describe("Filter by ACL type (e.g. 'record')"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table, operation, type, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`nameLIKE${table}`);
        if (operation) queryParts.push(`operation=${operation}`);
        if (type) queryParts.push(`type=${type}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");
        const result = await client.query("sys_security_acl", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,operation,type,active,condition,script,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_acl_get",
    "Get full ACL details by sys_id, including script and condition",
    {
      sys_id: z.string().describe("The sys_id of the ACL"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_security_acl", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_acl_create",
    "Create a new ACL (sys_security_acl)",
    {
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs for the new ACL"),
    },
    CREATE,
    async ({ data }) => {
      try {
        const record = await client.create("sys_security_acl", data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_acl_update",
    "Update an existing ACL (sys_security_acl)",
    {
      sys_id: z.string().describe("The sys_id of the ACL to update"),
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs to update"),
    },
    UPDATE,
    async ({ sys_id, data }) => {
      try {
        const record = await client.update("sys_security_acl", sys_id, data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
