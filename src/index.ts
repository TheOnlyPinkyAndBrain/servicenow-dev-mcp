import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ServiceNowClient } from "./client.js";

// Core platform tools
import { registerTableTools } from "./tools/table.js";
import { registerLogTools } from "./tools/logs.js";
import { registerSchemaTools } from "./tools/schema.js";
import { registerSystemTools } from "./tools/system.js";
import { registerSecurityTools } from "./tools/security.js";
import { registerUiTools } from "./tools/ui.js";
import { registerUpdateSetTools } from "./tools/update-set.js";
import { registerExecuteTools } from "./tools/execute.js";
import { registerDataPolicyTools } from "./tools/data-policy.js";
import { registerAttachmentTools } from "./tools/attachment.js";
import { registerBatchTools } from "./tools/batch.js";

// ITSM tools
import { registerIncidentTools } from "./tools/incident.js";
import { registerProblemTools } from "./tools/problem.js";
import { registerChangeTools } from "./tools/change.js";
import { registerSlaTools } from "./tools/sla.js";
import { registerApprovalTools } from "./tools/approval.js";

// Scripting & automation tools
import { registerScriptTools } from "./tools/script.js";
import { registerFlowTools } from "./tools/flow.js";
import { registerWorkflowTools } from "./tools/workflow.js";

// Service catalog tools
import { registerCatalogTools } from "./tools/catalog.js";

// Knowledge management tools
import { registerKnowledgeTools } from "./tools/knowledge.js";

// CMDB tools
import { registerConfigItemTools } from "./tools/config-items.js";
import { registerCmdbTools } from "./tools/cmdb.js";

// ITAM tools
import { registerAssetTools } from "./tools/asset.js";

// ITOM tools
import { registerEventManagementTools } from "./tools/event-management.js";

// CSM tools
import { registerCsmTools } from "./tools/csm.js";

// HRSD tools
import { registerHrsdTools } from "./tools/hrsd.js";

// SecOps tools
import { registerSecOpsTools } from "./tools/secops.js";

// GRC tools
import { registerGrcTools } from "./tools/grc.js";

// Performance Analytics tools
import { registerPerformanceAnalyticsTools } from "./tools/performance-analytics.js";

// CI/CD & ATF tools
import { registerCicdTools } from "./tools/cicd.js";

// Service Portal tools
import { registerServicePortalTools } from "./tools/service-portal.js";

// Integration & middleware tools
import { registerRestApiTools } from "./tools/rest-api.js";
import { registerImportSetTools } from "./tools/import-set.js";
import { registerNotificationTools } from "./tools/notification.js";
import { registerIntegrationTools } from "./tools/integration.js";

// Procurement & S2P tools
import { registerProcurementTools } from "./tools/procurement.js";
import { registerS2pTools } from "./tools/s2p.js";

// Diagnostics & debugging tools
import { registerDiagnosticsTools } from "./tools/diagnostics.js";
import { registerScheduledJobTools } from "./tools/scheduled-job.js";
import { registerEmailTools } from "./tools/email.js";

// Platform administration tools
import { registerDomainTools } from "./tools/domain.js";
import { registerScopeTools } from "./tools/scope.js";
import { registerUpgradeTools } from "./tools/upgrade.js";

const config = loadConfig();
const client = new ServiceNowClient(config);

const server = new McpServer({
  name: "servicenow-mcp",
  version: "3.1.0",
});

const registrars = [
  // Core platform
  registerTableTools,
  registerLogTools,
  registerSchemaTools,
  registerSystemTools,
  registerSecurityTools,
  registerUiTools,
  registerUpdateSetTools,
  registerExecuteTools,
  registerDataPolicyTools,
  registerAttachmentTools,
  registerBatchTools,

  // ITSM
  registerIncidentTools,
  registerProblemTools,
  registerChangeTools,
  registerSlaTools,
  registerApprovalTools,

  // Scripting & automation
  registerScriptTools,
  registerFlowTools,
  registerWorkflowTools,

  // Service catalog
  registerCatalogTools,

  // Knowledge management
  registerKnowledgeTools,

  // CMDB
  registerConfigItemTools,
  registerCmdbTools,

  // ITAM
  registerAssetTools,

  // ITOM
  registerEventManagementTools,

  // CSM
  registerCsmTools,

  // HRSD
  registerHrsdTools,

  // SecOps
  registerSecOpsTools,

  // GRC
  registerGrcTools,

  // Performance Analytics
  registerPerformanceAnalyticsTools,

  // CI/CD & ATF
  registerCicdTools,

  // Service Portal
  registerServicePortalTools,

  // Integration & middleware
  registerRestApiTools,
  registerImportSetTools,
  registerNotificationTools,
  registerIntegrationTools,

  // Procurement & S2P
  registerProcurementTools,
  registerS2pTools,

  // Diagnostics & debugging
  registerDiagnosticsTools,
  registerScheduledJobTools,
  registerEmailTools,

  // Platform administration
  registerDomainTools,
  registerScopeTools,
  registerUpgradeTools,
];

for (const register of registrars) {
  register(server, client, config.mode);
}

console.error(
  `ServiceNow MCP Server v3.0.0 started (mode: ${config.mode})`
);
console.error(`Instance: ${config.instanceUrl}`);

const transport = new StdioServerTransport();
await server.connect(transport);
