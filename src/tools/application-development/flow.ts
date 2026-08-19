import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import { ServiceNowApiError } from "../../client.js";
import type { Mode } from "../../types.js";
import { ACTION, CREATE, READ, UPDATE } from "../../annotations.js";
import { jsonResult, parseBackgroundScriptJsonOutput } from "../../utils.js";

function errorResult(error: unknown) {
  const message =
    error instanceof ServiceNowApiError
      ? `ServiceNow API Error (${error.statusCode}): ${error.detail}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

export function registerFlowTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // sn_flow_list — Both modes
  server.tool(
    "sn_flow_list",
    "List Flow Designer flows with status, scope, and trigger type",
    {
      active: z.boolean().optional().describe("Filter by active status"),
      scope: z.string().optional().describe("Filter by application scope"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ active, scope, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (scope) queryParts.push(`sys_scope.name=${scope}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_hub_flow", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,name,description,active,status,trigger_type,sys_scope,sys_updated_on",
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

  // sn_flow_get — Both modes
  server.tool(
    "sn_flow_get",
    "Get full Flow Designer flow details by sys_id",
    {
      sys_id: z.string().describe("The sys_id of the flow"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_hub_flow", sys_id);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_flow_list_actions — Both modes
  server.tool(
    "sn_flow_list_actions",
    "List Flow Designer actions and subflows",
    {
      active: z.boolean().optional().describe("Filter by active status"),
      scope: z.string().optional().describe("Filter by application scope"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ active, scope, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (scope) queryParts.push(`sys_scope.name=${scope}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_hub_action", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,name,description,active,status,sys_scope,sys_updated_on",
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

  server.tool(
    "sn_flow_action_type_list",
    "List Flow Designer action types (sys_hub_action_type_definition) — the catalog of available actions (from spokes and core) that flows and subflows can use.",
    {
      name: z.string().optional().describe("Filter by name/label (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");
        const result = await client.query("sys_hub_action_type_definition", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,label,category,description,active,sys_scope,sys_updated_on",
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

  // sn_flow_create — Develop only
  server.tool(
    "sn_flow_create",
    "Create a new Flow Designer flow",
    {
      data: z
        .record(z.string(), z.unknown())
        .describe("Field-value pairs for the new flow"),
    },
    CREATE,
    async ({ data }) => {
      try {
        const record = await client.create("sys_hub_flow", data);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_flow_update — Develop only
  server.tool(
    "sn_flow_update",
    "Update an existing Flow Designer flow",
    {
      sys_id: z.string().describe("The sys_id of the flow to update"),
      data: z
        .record(z.string(), z.unknown())
        .describe("Field-value pairs to update"),
    },
    UPDATE,
    async ({ sys_id, data }) => {
      try {
        const record = await client.update("sys_hub_flow", sys_id, data);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_flow_run — Develop only. There is no plain REST endpoint to invoke an
  // arbitrary Flow Designer flow by sys_id (unlike ATF's /api/now/v1/atf/test/run) —
  // Flow Designer's only public execution surface is the server-side
  // sn_fd.FlowAPI script API, or a per-flow Inbound REST trigger someone has
  // to build into the flow itself. So this routes through the background-script
  // engine, same as the other tools in this server that need capabilities the
  // Table/REST API doesn't expose.
  server.tool(
    "sn_flow_run",
    "Run a Flow Designer flow or subflow synchronously by sys_id or scoped name (e.g. 'global.my_flow'), and return its outputs. Executes via the server-side Flow API (sn_fd.FlowAPI) since Flow Designer has no generic REST endpoint to invoke an arbitrary flow — only flows built with their own Inbound REST trigger get a dedicated webhook URL.",
    {
      flow_id: z.string().describe("sys_id or scoped name (e.g. 'global.my_flow') of the flow or subflow to run"),
      is_subflow: z.boolean().optional().describe("True if flow_id refers to a subflow rather than a top-level flow (default false)"),
      inputs: z.record(z.string(), z.unknown()).optional().describe("Input values keyed by the flow's input variable names"),
    },
    ACTION,
    async ({ flow_id, is_subflow, inputs }) => {
      const script = [
        `var runner = sn_fd.FlowAPI.getRunner();`,
        `runner = ${JSON.stringify(!!is_subflow)} ? runner.subflow(${JSON.stringify(flow_id)}) : runner.flow(${JSON.stringify(flow_id)});`,
        `try {`,
        `  var result = runner.inForeground().withInputs(${JSON.stringify(inputs ?? {})}).run();`,
        `  gs.print(JSON.stringify({`,
        `    success: true,`,
        `    contextId: result.getContextId(),`,
        `    flowObjectType: result.getFlowObjectType(),`,
        `    flowObjectName: result.getFlowObjectName(),`,
        `    outputs: result.getOutputs()`,
        `  }));`,
        `} catch (e) {`,
        `  gs.print(JSON.stringify({ success: false, error: (e && e.message) ? e.message : String(e) }));`,
        `}`,
      ].join("\n");

      try {
        const result = await client.executeBackgroundScript(script);
        if (!result.success) {
          return errorResult(new Error(result.error ?? "Script execution failed"));
        }
        const parsed = parseBackgroundScriptJsonOutput(result.output) as { success: boolean; error?: string };
        if (!parsed.success) {
          return errorResult(new Error(parsed.error ?? "Flow run failed"));
        }
        return jsonResult(parsed);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
