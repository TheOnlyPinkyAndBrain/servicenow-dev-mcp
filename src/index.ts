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

// Needed for the "add a new instance" follow-up notification (see
// ServiceNowClient.ensureActiveInstance) -- must be registered before
// server.connect() below, per the SDK's registerCapabilities() contract.
server.server.registerCapabilities({ logging: {} });

// The client needs `server` for the instance-selection elicitation prompt.
const client = new ServiceNowClient(config, server);

for (const register of registrars) {
  register(server, client, config.mode);
}

// Separate from the generic registrars above: sn_script_execute /
// sn_script_execute_query need config.enableScriptExecute, not just
// config.mode, since they're gated by both.
registerExecuteTools(server, client, config.mode, config.enableScriptExecute);

// Fire the instance-selection prompt proactively once the client has
// finished the initialize handshake, rather than waiting for the first
// tool call -- oninitialized is the earliest point a server-initiated
// request (elicitInput) is valid on the connection. Errors (client
// doesn't support elicitation, etc.) are already swallowed inside
// resolveActiveInstance(); .catch() here is just a backstop.
server.server.oninitialized = () => {
  client.resolveActiveInstance().catch(() => {});
};

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
