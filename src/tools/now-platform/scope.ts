import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerScopeTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_scope_list",
    "List application scopes (sys_scope) — all scoped applications and their access modes",
    {
      name: z.string().optional().describe("Scope name (contains match)"),
      scope: z.string().optional().describe("Scope namespace (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, scope, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (scope) qp.push(`scopeLIKE${scope}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const result = await client.query("sys_scope", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,scope,short_description,version,active,private,runtime_access_tracking,sys_updated_on",
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
    "sn_scope_privilege_list",
    "List cross-scope access privilege records (sys_scope_privilege) — shows what cross-scope access has been requested, allowed, or denied",
    {
      source_scope: z.string().optional().describe("Source scope name (contains match) — the app requesting access"),
      target_scope: z.string().optional().describe("Target scope name (contains match) — the app being accessed"),
      status: z.enum(["Allowed", "Requested", "Invalidated"]).optional().describe("Status filter"),
      operation: z.string().optional().describe("Operation (e.g., execute, read, write)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ source_scope, target_scope, status, operation, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (source_scope) qp.push(`source_scope.nameLIKE${source_scope}`);
        if (target_scope) qp.push(`target_scope.nameLIKE${target_scope}`);
        if (status) qp.push(`status=${status}`);
        if (operation) qp.push(`operation=${operation}`);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_scope_privilege", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,source_scope,target_scope,operation,status,type,api_name,sys_updated_on",
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
    "sn_scope_pending_access",
    "List pending cross-scope access requests — requests awaiting admin approval",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ limit, offset }) => {
      try {
        const result = await client.query("sys_scope_privilege", {
          sysparm_query: "statusINRequested,Invalidated^ORDERBYDESCsys_updated_on",
          sysparm_fields: "sys_id,source_scope,target_scope,operation,status,type,api_name,sys_updated_on",
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

  server.tool(
    "sn_scope_restricted_caller",
    "List restricted caller access records — controls which scoped apps can call which APIs",
    {
      target_scope: z.string().optional().describe("Target scope name (contains match)"),
      status: z.string().optional().describe("Status filter"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ target_scope, status, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (target_scope) qp.push(`target_scope.nameLIKE${target_scope}`);
        if (status) qp.push(`status=${status}`);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_restricted_caller_access", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,caller_access,target_scope,operation,status,sys_updated_on",
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
