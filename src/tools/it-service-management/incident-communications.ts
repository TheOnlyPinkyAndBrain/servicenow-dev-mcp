import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Incident Communications / Major Incident Management.
// Requires com.snc.iam (Incident Communications) / com.snc.incident.mim.
export function registerIncidentCommsTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_incident_alert_list",
    "List incident alerts / major-incident communications (incident_alert) — the communication records that drive stakeholder updates during a major incident, with severity, comm plan, and source incident. Requires Incident Communications / Major Incident Management plugins.",
    {
      state: z.string().optional().describe("Filter by state"),
      severity: z.string().optional().describe("Filter by severity"),
      source_incident: z.string().optional().describe("Filter by the source incident sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, severity, source_incident, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (severity) queryParts.push(`severity=${severity}`);
        if (source_incident) queryParts.push(`source_incident=${source_incident}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCopened_at");
        const result = await client.query("incident_alert", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,severity,source_incident,comm_plan_type,assigned_to,assignment_group,opened_at,sys_updated_on",
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

  server.tool(
    "sn_incident_alert_get",
    "Get an incident alert / major-incident communication (incident_alert) by sys_id, together with its communication tasks (incident_alert_task).",
    {
      sys_id: z.string().describe("The sys_id of the incident alert"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [alert, tasks] = await Promise.all([
          client.getById("incident_alert", sys_id),
          client.query("incident_alert_task", {
            sysparm_query: `incident_alert=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,short_description,state,comm_task_type,assigned_to,assignment_group",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
        ]);
        return jsonResult({ alert, communicationTasks: tasks.records, taskCount: tasks.totalCount });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_incident_alert_task_list",
    "List incident communication tasks (incident_alert_task) — the individual stakeholder-communication work items under a major incident alert.",
    {
      incident_alert: z.string().optional().describe("Filter by parent incident_alert sys_id"),
      state: z.string().optional().describe("Filter by state"),
      assignment_group: z.string().optional().describe("Filter by assignment group name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ incident_alert, state, assignment_group, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (incident_alert) queryParts.push(`incident_alert=${incident_alert}`);
        if (state) queryParts.push(`state=${state}`);
        if (assignment_group) queryParts.push(`assignment_group.nameLIKE${assignment_group}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");
        const result = await client.query("incident_alert_task", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,incident_alert,comm_task_type,assigned_to,assignment_group,priority,sys_updated_on",
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
}
