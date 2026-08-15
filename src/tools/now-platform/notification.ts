import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerNotificationTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_notification_list",
    "List email notifications (sysevent_email_action). Shows notification name, table, event, conditions. Critical for debugging why emails are or aren't being sent.",
    {
      table: z.string().optional().describe("Filter by table name, e.g. 'incident'"),
      name: z.string().optional().describe("Filter by notification name (contains match)"),
      event_name: z.string().optional().describe("Filter by event name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table, name, event_name, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`collection=${table}`);
        if (name) queryParts.push(`nameLIKE${name}`);
        if (event_name) queryParts.push(`event_nameLIKE${event_name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sysevent_email_action", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,collection,event_name,active,recipient_fields,send_self,weight,condition,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });

        return jsonResult({
          totalCount: result.totalCount,
          count: result.records.length,
          records: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_notification_get",
    "Get full email notification details including message template, conditions, and recipients",
    {
      sys_id: z.string().describe("The sys_id of the notification"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sysevent_email_action", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_email_log",
    "Query email logs (sys_email) to debug email delivery. Shows recipient, subject, type, state, and errors.",
    {
      recipient: z.string().optional().describe("Filter by recipient email (contains match)"),
      subject: z.string().optional().describe("Filter by subject (contains match)"),
      type: z.enum(["sent", "received", "send-ready", "reply"]).optional().describe("Filter by email type"),
      state: z.string().optional().describe("Filter by state (e.g. 'sent', 'error', 'ready')"),
      instance: z.string().optional().describe("Filter by notification sys_id that generated this email"),
      start_time: z.string().optional().describe("Start of time range"),
      end_time: z.string().optional().describe("End of time range"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ recipient, subject, type, state, instance, start_time, end_time, limit }) => {
      try {
        const queryParts: string[] = [];
        if (recipient) queryParts.push(`recipientsLIKE${recipient}`);
        if (subject) queryParts.push(`subjectLIKE${subject}`);
        if (type) queryParts.push(`type=${type}`);
        if (state) queryParts.push(`state=${state}`);
        if (instance) queryParts.push(`instance=${instance}`);
        if (start_time) queryParts.push(`sys_created_on>=${start_time}`);
        if (end_time) queryParts.push(`sys_created_on<=${end_time}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_email", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,subject,recipients,type,state,direct,notification,error_string,sys_created_on",
          sysparm_limit: limit ?? 20,
        });

        return jsonResult({
          totalCount: result.totalCount,
          count: result.records.length,
          records: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_event_log",
    "Query the event log (sysevent) to trace event processing. Shows what events fired, their state, and processing details.",
    {
      name: z.string().optional().describe("Event name to filter (contains match)"),
      table: z.string().optional().describe("Filter by table name"),
      state: z.enum(["ready", "processed", "error"]).optional().describe("Filter by processing state"),
      instance: z.string().optional().describe("Filter by record sys_id that triggered the event"),
      start_time: z.string().optional().describe("Start of time range"),
      end_time: z.string().optional().describe("End of time range"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ name, table, state, instance, start_time, end_time, limit }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (table) queryParts.push(`table=${table}`);
        if (state) queryParts.push(`state=${state}`);
        if (instance) queryParts.push(`instance=${instance}`);
        if (start_time) queryParts.push(`sys_created_on>=${start_time}`);
        if (end_time) queryParts.push(`sys_created_on<=${end_time}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sysevent", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,table,instance,parm1,parm2,queue,state,process_on,processed,sys_created_on",
          sysparm_limit: limit ?? 20,
        });

        return jsonResult({
          totalCount: result.totalCount,
          count: result.records.length,
          records: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_event_registry_list",
    "List registered system events (sysevent_register) — the event names a table can fire (used by notifications, flows, and business rules).",
    {
      event_name: z.string().optional().describe("Filter by event name (contains match)"),
      table: z.string().optional().describe("Filter by the table that fires the event"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ event_name, table, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (event_name) queryParts.push(`event_nameLIKE${event_name}`);
        if (table) queryParts.push(`table=${table}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYevent_name");
        const result = await client.query("sysevent_register", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,event_name,table,description,queue,fired_by,sys_updated_on",
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
