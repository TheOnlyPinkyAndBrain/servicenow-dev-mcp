import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ServiceNowClient } from "./client.js";
import { registrars } from "./tools/registry.js";

const config = loadConfig();
const client = new ServiceNowClient(config);

const server = new McpServer({
  name: "servicenow-mcp",
  version: "3.12.1",
});

for (const register of registrars) {
  register(server, client, config.mode);
}

console.error(
  `ServiceNow MCP Server v3.12.1 started (mode: ${config.mode})`
);
console.error(`Instance: ${config.instanceUrl}`);

const transport = new StdioServerTransport();
await server.connect(transport);
