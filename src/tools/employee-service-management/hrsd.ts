import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";

export function registerHrsdTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_hr_case_list",
    "List HR cases (sn_hr_core_case) — all HR case types including lifecycle events and employee relations",
    {
      state: z.string().optional().describe("Case state"),
      hr_service: z.string().optional().describe("HR service name (contains match)"),
      subject_person: z.string().optional().describe("Subject person name (contains match)"),
      opened_for: z.string().optional().describe("Opened for person name (contains match)"),
      assignment_group: z.string().optional().describe("Assignment group name (contains match)"),
      sys_class_name: z.string().optional().describe("Case type: sn_hr_core_case, sn_hr_le_case, sn_hr_er_case"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ state, hr_service, subject_person, opened_for, assignment_group, sys_class_name, active, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (state) qp.push(`state=${state}`);
        if (hr_service) qp.push(`hr_service.nameLIKE${hr_service}`);
        if (subject_person) qp.push(`subject_person.nameLIKE${subject_person}`);
        if (opened_for) qp.push(`opened_for.nameLIKE${opened_for}`);
        if (assignment_group) qp.push(`assignment_group.nameLIKE${assignment_group}`);
        if (sys_class_name) qp.push(`sys_class_name=${sys_class_name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_hr_core_case", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,hr_service,subject_person,opened_for,assignment_group,assigned_to,opened_at,sys_class_name,active,sys_updated_on",
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
    "sn_hr_case_get",
    "Get full HR case details including tasks",
    {
      sys_id: z.string().describe("HR case sys_id"),
    },
    async ({ sys_id }) => {
      try {
        const [hrCase, tasks] = await Promise.all([
          client.getById("sn_hr_core_case", sys_id),
          client.query("sn_hr_core_task", {
            sysparm_query: `parent=${sys_id}`,
            sysparm_fields: "sys_id,number,short_description,state,assignment_group,assigned_to",
            sysparm_display_value: "true",
            sysparm_limit: 20,
          }),
        ]);
        return jsonResult({ hrCase, tasks: tasks.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_hr_service_list",
    "List HR services (COE services offered to employees)",
    {
      active: z.boolean().optional().describe("Active status (default true)"),
      topic: z.string().optional().describe("Topic/category name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ active, topic, limit }) => {
      try {
        const qp: string[] = [];
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        if (topic) qp.push(`topic_descriptor.nameLIKE${topic}`);
        qp.push("ORDERBYname");

        const result = await client.query("sn_hr_core_service", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,short_description,topic_descriptor,fulfillment_group,active,sys_updated_on",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_hr_lifecycle_event_list",
    "List HR lifecycle events (onboarding, offboarding, transfers, etc.)",
    {
      state: z.string().optional().describe("State filter"),
      subject_person: z.string().optional().describe("Subject person name (contains match)"),
      lifecycle_event_type: z.string().optional().describe("Lifecycle event type"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ state, subject_person, lifecycle_event_type, active, limit }) => {
      try {
        const qp: string[] = [];
        if (state) qp.push(`state=${state}`);
        if (subject_person) qp.push(`subject_person.nameLIKE${subject_person}`);
        if (lifecycle_event_type) qp.push(`lifecycle_event_type=${lifecycle_event_type}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_hr_le_case", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,subject_person,lifecycle_event_type,hr_service,assignment_group,opened_at,active,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_hr_profile_get",
    "Look up an HR profile for a user",
    {
      user: z.string().describe("User name or sys_id"),
    },
    async ({ user }) => {
      try {
        const isId = /^[a-f0-9]{32}$/.test(user);
        const query = isId ? `user=${user}` : `user.nameLIKE${user}`;
        const result = await client.query("sn_hr_core_profile", {
          sysparm_query: query,
          sysparm_fields: "sys_id,user,department,location,manager,job_title,employment_type,date_of_hire,date_of_exit,active",
          sysparm_limit: 5,
          sysparm_display_value: "true",
        });
        return jsonResult({ count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_hr_case_create",
    "Create an HR case",
    {
      short_description: z.string().describe("Short description"),
      hr_service: z.string().optional().describe("HR service sys_id"),
      opened_for: z.string().optional().describe("Opened for user sys_id"),
      subject_person: z.string().optional().describe("Subject person sys_id"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    async ({ short_description, hr_service, opened_for, subject_person, assignment_group, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (hr_service) body.hr_service = hr_service;
        if (opened_for) body.opened_for = opened_for;
        if (subject_person) body.subject_person = subject_person;
        if (assignment_group) body.assignment_group = assignment_group;
        const result = await client.create("sn_hr_core_case", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_hr_case_update",
    "Update an HR case",
    {
      sys_id: z.string().describe("HR case sys_id"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("sn_hr_core_case", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
