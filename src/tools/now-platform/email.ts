import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerEmailTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_email_list",
    "List email records (sys_email) — outbound and inbound emails. Filter by state, type, recipients, subject.",
    {
      type: z.enum(["send", "received", "send-ready", "received-ready"]).optional().describe("Email type"),
      state: z.enum(["ready", "send-ready", "sent", "send-ignored", "error", "skipped"]).optional().describe("Email state"),
      recipients: z.string().optional().describe("Recipient email (contains match)"),
      subject: z.string().optional().describe("Subject (contains match)"),
      target_table: z.string().optional().describe("Target table name"),
      created_after: z.string().optional().describe("Created after datetime"),
      created_before: z.string().optional().describe("Created before datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ type, state, recipients, subject, target_table, created_after, created_before, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (type) qp.push(`type=${type}`);
        if (state) qp.push(`state=${state}`);
        if (recipients) qp.push(`recipientsLIKE${recipients}`);
        if (subject) qp.push(`subjectLIKE${subject}`);
        if (target_table) qp.push(`target_table=${target_table}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        if (created_before) qp.push(`sys_created_on<=${created_before}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_email", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,type,state,subject,recipients,sender,target_table,instance,direct,notification,sys_created_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_email_get",
    "Get full email details including body, headers, and delivery info",
    {
      sys_id: z.string().describe("Email sys_id"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const email = await client.getById("sys_email", sys_id);
        return jsonResult(email);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_email_failed",
    "List failed/errored emails — emails that could not be sent",
    {
      created_after: z.string().optional().describe("Created after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ created_after, limit, offset }) => {
      try {
        const qp: string[] = ["stateINerror,send-ignored,skipped", "type=send"];
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_email", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,state,subject,recipients,sender,target_table,notification,error_string,sys_created_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_email_trace",
    "Trace an email notification from event to delivery. Queries sysevent, notification, sys_email, and sys_email_log.",
    {
      record_sys_id: z.string().describe("The record sys_id that triggered the notification (e.g., incident sys_id)"),
      notification_name: z.string().optional().describe("Notification name to filter (contains match)"),
      limit: z.coerce.number().min(1).max(20).optional().describe("Max records per step (default 10)"),
    },
    READ,
    async ({ record_sys_id, notification_name, limit }) => {
      try {
        const lim = limit ?? 10;
        const notifQuery = notification_name ? `^nameLIKE${notification_name}` : "";

        const [events, emails, emailLogs] = await Promise.all([
          client.query("sysevent", {
            sysparm_query: `instance=${record_sys_id}^ORDERBYDESCsys_created_on`,
            sysparm_fields: "sys_id,name,instance,table,parm1,parm2,queue,state,process_on,claimed_by,sys_created_on",
            sysparm_limit: lim,
          }),
          client.query("sys_email", {
            sysparm_query: `instance=${record_sys_id}^type=send${notifQuery}^ORDERBYDESCsys_created_on`,
            sysparm_fields: "sys_id,state,subject,recipients,notification,type,sys_created_on",
            sysparm_limit: lim,
          }),
          client.query("sys_email_log", {
            sysparm_query: `email.instance=${record_sys_id}^ORDERBYDESCsys_created_on`,
            sysparm_fields: "sys_id,email,event,notification,message,sys_created_on",
            sysparm_limit: lim,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          events: { count: events.records.length, records: events.records },
          emails: { count: emails.records.length, records: emails.records },
          emailLogs: { count: emailLogs.records.length, records: emailLogs.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_notification_config_list",
    "List email notification configurations (sysevent_email_action) — what notifications exist and their conditions",
    {
      name: z.string().optional().describe("Notification name (contains match)"),
      collection: z.string().optional().describe("Table name"),
      active: z.boolean().optional().describe("Active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, collection, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (collection) qp.push(`collection=${collection}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYname");

        const result = await client.query("sysevent_email_action", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,collection,event_name,recipient_fields,weight,send_self,active,condition,sys_updated_on",
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
    "sn_email_account_list",
    "List email account configurations (inbound/outbound SMTP/POP/IMAP settings)",
    {
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const result = await client.query("sys_email_account", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,type,server,port,active,sys_updated_on",
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
    "sn_email_template_list",
    "List email templates (sysevent_email_template) — reusable subject/body templates referenced by notifications.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      collection: z.string().optional().describe("Filter by the target table (collection)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, collection, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (collection) queryParts.push(`collection=${collection}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");
        const result = await client.query("sysevent_email_template", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,subject,collection,email_layout,sys_updated_on",
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
