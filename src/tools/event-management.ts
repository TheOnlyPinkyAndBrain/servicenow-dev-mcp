import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerEventManagementTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_event_list",
    "List events (em_event) — raw events before alert correlation. Filter by severity, source, node, time range.",
    {
      severity: z.enum(["1", "2", "3", "4", "5"]).optional().describe("Severity: 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=OK/Clear"),
      source: z.string().optional().describe("Event source (contains match)"),
      node: z.string().optional().describe("Node/host name (contains match)"),
      event_class: z.string().optional().describe("Event class"),
      type: z.string().optional().describe("Event type"),
      state: z.string().optional().describe("Event processing state"),
      created_after: z.string().optional().describe("Created after datetime"),
      created_before: z.string().optional().describe("Created before datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ severity, source, node, event_class, type, state, created_after, created_before, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (severity) qp.push(`severity=${severity}`);
        if (source) qp.push(`sourceLIKE${source}`);
        if (node) qp.push(`nodeLIKE${node}`);
        if (event_class) qp.push(`event_class=${event_class}`);
        if (type) qp.push(`type=${type}`);
        if (state) qp.push(`state=${state}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        if (created_before) qp.push(`sys_created_on<=${created_before}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("em_event", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,source,event_class,resource,node,type,severity,description,message_key,state,additional_info,sys_created_on",
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
    "sn_alert_list",
    "List alerts (em_alert) — correlated alerts from events. Filter by severity, state, CI, group.",
    {
      severity: z.enum(["1", "2", "3", "4", "5"]).optional().describe("Severity: 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=OK/Clear"),
      state: z.string().optional().describe("Alert state: Open, Reopen, Flapping, Closed"),
      acknowledged: z.boolean().optional().describe("Filter by acknowledged status"),
      group_source: z.string().optional().describe("Alert group source"),
      cmdb_ci: z.string().optional().describe("Configuration item name (contains match)"),
      assignment_group: z.string().optional().describe("Assignment group name (contains match)"),
      created_after: z.string().optional().describe("Created after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ severity, state, acknowledged, group_source, cmdb_ci, assignment_group, created_after, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (severity) qp.push(`severity=${severity}`);
        if (state) qp.push(`state=${state}`);
        if (acknowledged !== undefined) qp.push(`acknowledged=${acknowledged}`);
        if (group_source) qp.push(`group_sourceLIKE${group_source}`);
        if (cmdb_ci) qp.push(`cmdb_ci.nameLIKE${cmdb_ci}`);
        if (assignment_group) qp.push(`assignment_group.nameLIKE${assignment_group}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("em_alert", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,source,severity,state,acknowledged,description,cmdb_ci,assignment_group,assigned_to,group_source,event_count,initial_event_time,last_event_time,sys_created_on",
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
    "sn_alert_get",
    "Get full alert details including related events and secondary alerts",
    {
      sys_id: z.string().describe("Alert sys_id"),
    },
    async ({ sys_id }) => {
      try {
        const [alert, relatedEvents] = await Promise.all([
          client.getById("em_alert", sys_id),
          client.query("em_event", {
            sysparm_query: `alert=${sys_id}^ORDERBYDESCsys_created_on`,
            sysparm_fields: "sys_id,source,severity,description,node,resource,type,sys_created_on",
            sysparm_display_value: "true",
            sysparm_limit: 50,
          }),
        ]);
        return jsonResult({ alert, relatedEvents: relatedEvents.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_event_rule_list",
    "List event processing rules (em_event_rule) that transform raw events",
    {
      active: z.boolean().optional().describe("Filter by active status (default true)"),
      source: z.string().optional().describe("Source filter"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ active, source, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        if (source) qp.push(`sourceLIKE${source}`);
        qp.push("ORDERBYorder");

        const result = await client.query("em_event_rule", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,source,active,order,filter,sys_updated_on",
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

  server.tool(
    "sn_event_push",
    "Push an event to ServiceNow Event Management via the em/jsonv2 API",
    {
      source: z.string().describe("Event source identifier"),
      node: z.string().describe("Node/host name"),
      type: z.string().describe("Event type"),
      resource: z.string().describe("Resource name"),
      severity: z.enum(["1", "2", "3", "4", "5"]).describe("Severity: 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=OK/Clear"),
      description: z.string().describe("Event description"),
      message_key: z.string().optional().describe("Message key for event deduplication"),
      event_class: z.string().optional().describe("Event class"),
      additional_info: z.string().optional().describe("Additional info JSON string"),
    },
    async ({ source, node, type, resource, severity, description, message_key, event_class, additional_info }) => {
      try {
        const body: Record<string, unknown> = {
          records: [{
            source, node, type, resource, severity, description,
            ...(message_key ? { message_key } : {}),
            ...(event_class ? { event_class } : {}),
            ...(additional_info ? { additional_info } : {}),
          }],
        };
        const result = await client.restApi("POST", "/api/global/em/jsonv2", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_alert_update",
    "Update an alert (acknowledge, assign, close, etc.)",
    {
      sys_id: z.string().describe("Alert sys_id"),
      fields: z.record(z.unknown()).describe("Fields to update (e.g., acknowledged, state, assignment_group)"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("em_alert", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
