import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ServiceNowClient } from "./client.js";
import { registrars } from "./tools/registry.js";
import { registerExecuteTools } from "./tools/now-platform/execute.js";

const config = loadConfig();
const client = new ServiceNowClient(config);

const SERVER_VERSION = "3.13.0";

const server = new McpServer({
  name: "servicenow-mcp",
  version: SERVER_VERSION,
});

for (const register of registrars) {
  register(server, client, config.mode);
}

// Separate from the generic registrars above: sn_script_execute /
// sn_script_execute_query need config.enableScriptExecute, not just
// config.mode, since they're gated by both.
registerExecuteTools(server, client, config.mode, config.enableScriptExecute, config.instanceUrl);

console.error(
  `ServiceNow MCP Server v${SERVER_VERSION} started (mode: ${config.mode}, script-execute: ${
    config.mode === "develop" && config.enableScriptExecute ? "enabled" : "disabled"
  })`
);
console.error(`Instance: ${config.instanceUrl}`);

const transport = new StdioServerTransport();
await server.connect(transport);
