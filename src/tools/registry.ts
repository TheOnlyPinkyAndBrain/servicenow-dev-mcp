import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";

// Now Platform (core) tools
import { registerTableTools } from "./now-platform/table.js";
import { registerLogTools } from "./now-platform/logs.js";
import { registerSchemaTools } from "./now-platform/schema.js";
import { registerSystemTools } from "./now-platform/system.js";
import { registerUpdateSetTools } from "./now-platform/update-set.js";
import { registerExecuteTools } from "./now-platform/execute.js";
import { registerDataPolicyTools } from "./now-platform/data-policy.js";
import { registerAttachmentTools } from "./now-platform/attachment.js";
import { registerBatchTools } from "./now-platform/batch.js";
import { registerNotificationTools } from "./now-platform/notification.js";
import { registerDiagnosticsTools } from "./now-platform/diagnostics.js";
import { registerScheduledJobTools } from "./now-platform/scheduled-job.js";
import { registerEmailTools } from "./now-platform/email.js";
import { registerDomainTools } from "./now-platform/domain.js";
import { registerScopeTools } from "./now-platform/scope.js";
import { registerUpgradeTools } from "./now-platform/upgrade.js";

// Platform Security / UI
import { registerSecurityTools } from "./platform-security/security.js";
import { registerAclTools } from "./platform-security/acl.js";
import { registerUiTools } from "./platform-user-interface/ui.js";
import { registerUiConfigTools } from "./platform-user-interface/ui-policy.js";
import { registerServicePortalTools } from "./platform-user-interface/service-portal.js";

// ITSM tools
import { registerIncidentTools } from "./it-service-management/incident.js";
import { registerProblemTools } from "./it-service-management/problem.js";
import { registerChangeTools } from "./it-service-management/change.js";
import { registerSlaTools } from "./it-service-management/sla.js";
import { registerApprovalTools } from "./it-service-management/approval.js";
import { registerCatalogTools } from "./it-service-management/catalog.js";
import { registerOnCallTools } from "./it-service-management/on-call.js";
import { registerWalkUpTools } from "./it-service-management/walk-up.js";
import { registerUniversalRequestTools } from "./it-service-management/universal-request.js";
import { registerCimTools } from "./it-service-management/continual-improvement.js";
import { registerOutageTools } from "./it-service-management/outage.js";
import { registerIncidentCommsTools } from "./it-service-management/incident-communications.js";
import { registerBenchmarkTools } from "./it-service-management/benchmarks.js";

// Application development (scripting, flow, workflow, CI/CD)
import { registerScriptTools } from "./application-development/script.js";
import { registerFlowTools } from "./application-development/flow.js";
import { registerWorkflowTools } from "./application-development/workflow.js";
import { registerCicdTools } from "./application-development/cicd.js";

// ServiceNow Platform (CMDB, Knowledge, Interaction, Skills)
import { registerKnowledgeTools } from "./servicenow-platform/knowledge.js";
import { registerCmdbTools } from "./servicenow-platform/cmdb.js";
import { registerInteractionTools } from "./servicenow-platform/interaction.js";
import { registerSkillTools } from "./servicenow-platform/skills.js";

// ITAM / ITOM
import { registerAssetTools } from "./it-asset-management/asset.js";
import { registerEventManagementTools } from "./it-operations-management/event-management.js";

// CSM / HRSD
import { registerCsmTools } from "./customer-service-management/csm.js";
import { registerHrsdTools } from "./employee-service-management/hrsd.js";

// SecOps / GRC
import { registerSecOpsTools } from "./security-management/secops.js";
import { registerGrcTools } from "./governance-risk-compliance/grc.js";

// Platform Analytics
import { registerPerformanceAnalyticsTools } from "./now-intelligence/performance-analytics.js";

// Integration
import { registerRestApiTools } from "./integrate-applications/rest-api.js";
import { registerImportSetTools } from "./integrate-applications/import-set.js";
import { registerIntegrationTools } from "./integrate-applications/integration.js";

// Source-to-Pay
import { registerProcurementTools } from "./source-to-pay-operations/procurement.js";
import { registerS2pTools } from "./source-to-pay-operations/s2p.js";

export type Registrar = (
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
) => void;

/**
 * Single source of truth for every tool module registered by the server.
 * Both src/index.ts (runtime) and the contract test import this list, so the
 * test always covers exactly what the server registers.
 */
export const registrars: Registrar[] = [
  // Now Platform (core)
  registerTableTools,
  registerLogTools,
  registerSchemaTools,
  registerSystemTools,
  registerUpdateSetTools,
  registerExecuteTools,
  registerDataPolicyTools,
  registerAttachmentTools,
  registerBatchTools,
  registerNotificationTools,
  registerDiagnosticsTools,
  registerScheduledJobTools,
  registerEmailTools,
  registerDomainTools,
  registerScopeTools,
  registerUpgradeTools,

  // Platform Security / UI
  registerSecurityTools,
  registerAclTools,
  registerUiTools,
  registerUiConfigTools,
  registerServicePortalTools,

  // ITSM
  registerIncidentTools,
  registerProblemTools,
  registerChangeTools,
  registerSlaTools,
  registerApprovalTools,
  registerCatalogTools,
  registerOnCallTools,
  registerWalkUpTools,
  registerUniversalRequestTools,
  registerCimTools,
  registerOutageTools,
  registerIncidentCommsTools,
  registerBenchmarkTools,

  // Application development
  registerScriptTools,
  registerFlowTools,
  registerWorkflowTools,
  registerCicdTools,

  // ServiceNow Platform (CMDB, Knowledge, Interaction, Skills)
  registerKnowledgeTools,
  registerCmdbTools,
  registerInteractionTools,
  registerSkillTools,

  // ITAM / ITOM
  registerAssetTools,
  registerEventManagementTools,

  // CSM / HRSD
  registerCsmTools,
  registerHrsdTools,

  // SecOps / GRC
  registerSecOpsTools,
  registerGrcTools,

  // Platform Analytics
  registerPerformanceAnalyticsTools,

  // Integration
  registerRestApiTools,
  registerImportSetTools,
  registerIntegrationTools,

  // Source-to-Pay
  registerProcurementTools,
  registerS2pTools,
];
