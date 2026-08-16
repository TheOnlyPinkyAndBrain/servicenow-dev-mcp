import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { ACTION, READ } from "../../annotations.js";

// Instance selection/switching is session/config metadata, not a ServiceNow
// write, so both tools here work in debug mode too -- unlike the rest of
// this server, mode never gates them.
export function registerInstanceTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_instance_list",
    "List every ServiceNow instance configured for this MCP server (via SERVICENOW_INSTANCES) and which one is currently active. Only useful when more than one instance is configured -- SERVICENOW_INSTANCES is unset in most setups, which means exactly one instance ('default').",
    {},
    READ,
    async () => {
      try {
        // Give the elicitation-based first-call instance prompt (if any) a
        // chance to run before reporting what's active, so this reflects
        // the human's actual choice rather than the pre-prompt default.
        await client.resolveActiveInstance();
        return jsonResult({ instances: client.listInstances() });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_instance_switch",
    "Switch which configured ServiceNow instance subsequent tool calls in this session target. Only useful when more than one instance is configured via SERVICENOW_INSTANCES -- use sn_instance_list to see the available names first. Resets any cached background-script session (sn_script_execute) since it's tied to the previous instance.",
    {
      name: z.string().describe("The instance name to switch to, as listed by sn_instance_list"),
    },
    ACTION,
    async ({ name }) => {
      try {
        await client.switchInstance(name);
        return jsonResult({ switchedTo: name, instances: client.listInstances() });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
