import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ServiceNowClient } from "./client.js";

// Core platform tools
import { registerTableTools } from "./tools/now-platform/table.js";
import { registerLogTools } from "./tools/now-platform/logs.js";
import { registerSchemaTools } from "./tools/now-platform/schema.js";
import { registerSystemTools } from "./tools/now-platform/system.js";
import { registerSecurityTools } from "./tools/platform-security/security.js";
import { registerUiTools } from "./tools/platform-user-interface/ui.js";
import { registerUpdateSetTools } from "./tools/now-platform/update-set.js";
import { registerExecuteTools } from "./tools/now-platform/execute.js";
import { registerDataPolicyTools } from "./tools/now-platform/data-policy.js";
import { registerAttachmentTools } from "./tools/now-platform/attachment.js";
import { registerBatchTools } from "./tools/now-platform/batch.js";

// ITSM tools
import { registerIncidentTools } from "./tools/it-service-management/incident.js";
import { registerProblemTools } from "./tools/it-service-management/problem.js";
import { registerChangeTools } from "./tools/it-service-management/change.js";
import { registerSlaTools } from "./tools/it-service-management/sla.js";
import { registerApprovalTools } from "./tools/it-service-management/approval.js";

// Scripting & automation tools
import { registerScriptTools } from "./tools/application-development/script.js";
import { registerFlowTools } from "./tools/application-development/flow.js";
import { registerWorkflowTools } from "./tools/application-development/workflow.js";

// Service catalog tools
import { registerCatalogTools } from "./tools/it-service-management/catalog.js";

// Knowledge management tools
import { registerKnowledgeTools } from "./tools/servicenow-platform/knowledge.js";

// CMDB tools
import { registerConfigItemTools } from "./tools/servicenow-platform/config-items.js";
import { registerCmdbTools } from "./tools/servicenow-platform/cmdb.js";

// ITAM tools
import { registerAssetTools } from "./tools/it-asset-management/asset.js";

// ITOM tools
import { registerEventManagementTools } from "./tools/it-operations-management/event-management.js";

// CSM tools
import { registerCsmTools } from "./tools/customer-service-management/csm.js";

// HRSD tools
import { registerHrsdTools } from "./tools/employee-service-management/hrsd.js";

// SecOps tools
import { registerSecOpsTools } from "./tools/security-management/secops.js";

// GRC tools
import { registerGrcTools } from "./tools/governance-risk-compliance/grc.js";

// Performance Analytics tools
import { registerPerformanceAnalyticsTools } from "./tools/now-intelligence/performance-analytics.js";

// CI/CD & ATF tools
import { registerCicdTools } from "./tools/application-development/cicd.js";

// Service Portal tools
import { registerServicePortalTools } from "./tools/platform-user-interface/service-portal.js";

// Integration & middleware tools
import { registerRestApiTools } from "./tools/integrate-applications/rest-api.js";
import { registerImportSetTools } from "./tools/integrate-applications/import-set.js";
import { registerNotificationTools } from "./tools/now-platform/notification.js";
import { registerIntegrationTools } from "./tools/integrate-applications/integration.js";

// Procurement & S2P tools
import { registerProcurementTools } from "./tools/source-to-pay-operations/procurement.js";
import { registerS2pTools } from "./tools/source-to-pay-operations/s2p.js";

// Diagnostics & debugging tools
import { registerDiagnosticsTools } from "./tools/now-platform/diagnostics.js";
import { registerScheduledJobTools } from "./tools/now-platform/scheduled-job.js";
import { registerEmailTools } from "./tools/now-platform/email.js";

// Platform administration tools
import { registerDomainTools } from "./tools/now-platform/domain.js";
import { registerScopeTools } from "./tools/now-platform/scope.js";
import { registerUpgradeTools } from "./tools/now-platform/upgrade.js";

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
  `ServiceNow MCP Server v3.1.0 started (mode: ${config.mode})`
);
console.error(`Instance: ${config.instanceUrl}`);

const transport = new StdioServerTransport();
await server.connect(transport);
