import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult, textResult } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

export function registerUpdateSetTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_update_set_list",
    "List update sets with state, application, and description. Core ServiceNow development workflow tool.",
    {
      state: z.enum(["in progress", "complete", "ignore", "previous"]).optional().describe("Filter by state"),
      application: z.string().optional().describe("Filter by application/scope name"),
      name: z.string().optional().describe("Filter by name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, application, name, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (application) queryParts.push(`application.name=${application}`);
        if (name) queryParts.push(`nameLIKE${name}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_update_set", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,state,description,application,is_default,installed_from,sys_created_by,sys_created_on,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });

        return jsonResult({
          totalCount: result.totalCount,
          count: result.records.length,
          records: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_update_set_get",
    "Get full update set details including description and state",
    {
      sys_id: z.string().describe("The sys_id of the update set"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_update_set", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_update_set_changes",
    "List all customer updates (changes) in an update set. Shows what records were modified, their type, target table, and action. Essential for reviewing what an update set contains before promoting.",
    {
      update_set_sys_id: z.string().describe("The sys_id of the update set"),
      type: z.string().optional().describe("Filter by update type/name (e.g. 'Business Rule', 'Script Include', 'UI Policy')"),
      target_name: z.string().optional().describe("Filter by target record name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ update_set_sys_id, type, target_name, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        queryParts.push(`update_set=${update_set_sys_id}`);
        if (type) queryParts.push(`typeLIKE${type}`);
        if (target_name) queryParts.push(`target_nameLIKE${target_name}`);
        queryParts.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_update_xml", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,type,target_name,action,update_set,sys_created_by,sys_created_on,sys_updated_on",
          sysparm_limit: limit ?? 50,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });

        return jsonResult({
          updateSetSysId: update_set_sys_id,
          totalCount: result.totalCount,
          count: result.records.length,
          changes: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_update_set_create",
    "Create a new update set",
    {
      name: z.string().describe("Name for the update set"),
      description: z.string().optional().describe("Description of the update set"),
      parent: z.string().optional().describe("sys_id of parent update set (for batching)"),
    },
    CREATE,
    async ({ name, description, parent }) => {
      try {
        const data: Record<string, unknown> = { name, state: "in progress" };
        if (description) data.description = description;
        if (parent) data.parent = parent;
        const record = await client.create("sys_update_set", data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_update_set_update",
    "Update an existing update set (change state, name, description)",
    {
      sys_id: z.string().describe("The sys_id of the update set to update"),
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs to update (e.g. state, name, description)"),
    },
    UPDATE,
    async ({ sys_id, data }) => {
      try {
        const record = await client.update("sys_update_set", sys_id, data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
