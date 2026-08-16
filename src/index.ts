import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ServiceNowClient } from "./client.js";
import { registrars } from "./tools/registry.js";
import { registerExecuteTools } from "./tools/now-platform/execute.js";

const config = loadConfig();

const SERVER_VERSION = "3.13.0";

const server = new McpServer({
  name: "servicenow-mcp",
  version: SERVER_VERSION,
});

// The client needs `server` for the multi-instance elicitation prompt
// (asked lazily on the first tool call, not here at startup — an MCP
// server is spawned headlessly, with no request context yet to prompt on).
const client = new ServiceNowClient(config, server);

for (const register of registrars) {
  register(server, client, config.mode);
}

// Separate from the generic registrars above: sn_script_execute /
// sn_script_execute_query need config.enableScriptExecute, not just
// config.mode, since they're gated by both.
registerExecuteTools(server, client, config.mode, config.enableScriptExecute);

const instanceNames = Object.keys(config.instances);
const instanceSummary =
  instanceNames.length > 1
    ? `${instanceNames.length} instances configured (${instanceNames.join(", ")}), defaulting to "${config.defaultInstance}" until sn_instance_switch or the instance-selection prompt runs`
    : `Instance: ${config.instances[config.defaultInstance].instanceUrl}`;

console.error(
  `ServiceNow MCP Server v${SERVER_VERSION} started (mode: ${config.mode}, script-execute: ${
    config.mode === "develop" && config.enableScriptExecute ? "enabled" : "disabled"
  })`
);
console.error(instanceSummary);

const transport = new StdioServerTransport();
await server.connect(transport);
