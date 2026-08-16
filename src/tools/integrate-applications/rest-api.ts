import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

export function registerRestApiTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_rest_api_list",
    "List Scripted REST APIs (sys_ws_definition). Shows API name, namespace, base URI, and whether it's active.",
    {
      name: z.string().optional().describe("Filter by API name (contains match)"),
      namespace: z.string().optional().describe("Filter by namespace (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, namespace, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (namespace) queryParts.push(`namespaceLIKE${namespace}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_ws_definition", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,namespace,short_description,active,base_uri,produces,consumes,sys_scope,sys_updated_on",
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
    "sn_rest_api_get",
    "Get full Scripted REST API details with all its resources/endpoints (sys_ws_operation)",
    {
      sys_id: z.string().describe("The sys_id of the Scripted REST API"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [api, resources] = await Promise.all([
          client.getById("sys_ws_definition", sys_id),
          client.query("sys_ws_operation", {
            sysparm_query: `web_service_definition=${sys_id}^ORDERBYname`,
            sysparm_fields: "sys_id,name,http_method,relative_path,active,operation_uri,short_description",
            sysparm_limit: 50,
          }),
        ]);

        return jsonResult({
          api,
          resources: resources.records,
          resourceCount: resources.totalCount,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_rest_api_resource_get",
    "Get full details of a Scripted REST API resource/endpoint including its script (sys_ws_operation)",
    {
      sys_id: z.string().describe("The sys_id of the REST API resource"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_ws_operation", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_rest_api_create",
    "Create a new Scripted REST API definition",
    {
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs (name, namespace, short_description, etc.)"),
    },
    CREATE,
    async ({ data }) => {
      try {
        const record = await client.create("sys_ws_definition", data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_rest_api_resource_create",
    "Create a new Scripted REST API resource/endpoint",
    {
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs (name, http_method, relative_path, operation_script, web_service_definition, etc.)"),
    },
    CREATE,
    async ({ data }) => {
      try {
        const record = await client.create("sys_ws_operation", data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_rest_api_resource_update",
    "Update a Scripted REST API resource/endpoint",
    {
      sys_id: z.string().describe("The sys_id of the resource to update"),
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs to update"),
    },
    UPDATE,
    async ({ sys_id, data }) => {
      try {
        const record = await client.update("sys_ws_operation", sys_id, data);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
