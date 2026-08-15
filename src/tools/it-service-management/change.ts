import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { ACTION, CREATE, READ, UPDATE } from "../../annotations.js";

export function registerChangeTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_change_list",
    "List change requests with filters for type, state, risk, assignment group, and time range",
    {
      type: z.enum(["normal", "standard", "emergency"]).optional().describe("Change type"),
      state: z.string().optional().describe("State: -5=New, -4=Assess, -3=Authorize, -2=Scheduled, -1=Implement, 0=Review, 3=Closed, 4=Canceled"),
      risk: z.enum(["1", "2", "3", "4"]).optional().describe("Risk: 1=High, 2=Significant, 3=Moderate, 4=Low"),
      assignment_group: z.string().optional().describe("Assignment group name (contains match)"),
      category: z.string().optional().describe("Category value"),
      start_after: z.string().optional().describe("Planned start after datetime"),
      start_before: z.string().optional().describe("Planned start before datetime"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ type, state, risk, assignment_group, category, start_after, start_before, active, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (type) qp.push(`type=${type}`);
        if (state) qp.push(`state=${state}`);
        if (risk) qp.push(`risk=${risk}`);
        if (assignment_group) qp.push(`assignment_group.nameLIKE${assignment_group}`);
        if (category) qp.push(`category=${category}`);
        if (start_after) qp.push(`start_date>=${start_after}`);
        if (start_before) qp.push(`start_date<=${start_before}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("change_request", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,type,state,risk,impact,category,assignment_group,assigned_to,requested_by,start_date,end_date,cab_required,on_hold,active,sys_updated_on",
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
    "sn_change_get",
    "Get full change request details including change tasks, affected CIs, and approvals",
    {
      sys_id: z.string().describe("Change request sys_id"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [change, changeTasks, affectedCIs, approvals, conflicts] = await Promise.all([
          client.getById("change_request", sys_id),
          client.query("change_task", {
            sysparm_query: `change_request=${sys_id}^ORDERBYorder`,
            sysparm_fields: "sys_id,number,short_description,state,change_task_type,assignment_group,assigned_to,planned_start_date,planned_end_date",
            sysparm_display_value: "true",
            sysparm_limit: 50,
          }),
          client.query("task_ci", {
            sysparm_query: `task=${sys_id}`,
            sysparm_fields: "sys_id,ci_item,ci_item.name,ci_item.sys_class_name",
            sysparm_display_value: "true",
            sysparm_limit: 50,
          }),
          client.query("sysapproval_approver", {
            sysparm_query: `document_id=${sys_id}`,
            sysparm_fields: "sys_id,approver,state,comments,sys_updated_on",
            sysparm_display_value: "true",
            sysparm_limit: 20,
          }),
          client.query("change_conflict", {
            sysparm_query: `change_request=${sys_id}`,
            sysparm_fields: "sys_id,conflict_type,conflicting_change,configuration_item,window,status",
            sysparm_display_value: "true",
            sysparm_limit: 20,
          }),
        ]);
        return jsonResult({
          change,
          changeTasks: changeTasks.records,
          affectedCIs: affectedCIs.records,
          approvals: approvals.records,
          conflicts: conflicts.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_change_task_list",
    "List change tasks for a change request or across all changes",
    {
      change_request: z.string().optional().describe("Filter by change request sys_id"),
      state: z.string().optional().describe("Filter by state"),
      change_task_type: z.string().optional().describe("Filter by task type (e.g., planning, implementation, review, testing)"),
      assignment_group: z.string().optional().describe("Assignment group name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ change_request, state, change_task_type, assignment_group, limit }) => {
      try {
        const qp: string[] = [];
        if (change_request) qp.push(`change_request=${change_request}`);
        if (state) qp.push(`state=${state}`);
        if (change_task_type) qp.push(`change_task_type=${change_task_type}`);
        if (assignment_group) qp.push(`assignment_group.nameLIKE${assignment_group}`);
        qp.push("ORDERBYorder");

        const result = await client.query("change_task", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,change_task_type,change_request,assignment_group,assigned_to,planned_start_date,planned_end_date",
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
    "sn_change_standard_templates",
    "List standard change templates/proposals",
    {
      active: z.boolean().optional().describe("Filter by active status (default true)"),
      category: z.string().optional().describe("Category filter"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ active, category, limit }) => {
      try {
        const qp: string[] = [];
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        if (category) qp.push(`category=${category}`);
        qp.push("ORDERBYname");

        const result = await client.query("std_change_proposal", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,short_description,category,template_value,active,sys_updated_on",
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
    "sn_change_model_list",
    "List change models (chg_model) — the model-driven definitions that govern change types (normal, standard, emergency, and custom). Modern change management is model-based; use this to discover available models before creating a change.",
    {
      name: z.string().optional().describe("Filter by model name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");
        const result = await client.query("chg_model", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,description,active,default_change_model,itil_change_process,table_name,sys_updated_on",
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
    "sn_cab_meeting_list",
    "List Change Advisory Board (CAB) meetings (cab_meeting). Shows scheduled/held CAB meetings for reviewing changes.",
    {
      state: z.string().optional().describe("Filter by state (e.g. 'scheduled', 'in_progress', 'complete')"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");
        const result = await client.query("cab_meeting", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,state,cab_definition,manager,organizer,start,end,agenda_locked,sys_updated_on",
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
    "sn_cab_agenda_list",
    "List CAB meeting agenda items (cab_agenda_item) — the changes queued for review at a CAB meeting.",
    {
      cab_meeting: z.string().optional().describe("Filter by CAB meeting sys_id"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ cab_meeting, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (cab_meeting) queryParts.push(`cab_meeting=${cab_meeting}`);
        queryParts.push("ORDERBYorder");
        const result = await client.query("cab_agenda_item", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,cab_meeting,task,order,state,decision,sys_updated_on",
          sysparm_limit: limit ?? 50,
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
    "sn_change_create",
    "Create a change request using the Change Management API (sn_chg_rest). Supports normal, standard, and emergency types.",
    {
      type: z.enum(["normal", "standard", "emergency"]).describe("Change type"),
      short_description: z.string().describe("Short description"),
      description: z.string().optional().describe("Full description"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      category: z.string().optional().describe("Category"),
      risk: z.enum(["1", "2", "3", "4"]).optional().describe("Risk level"),
      impact: z.enum(["1", "2", "3"]).optional().describe("Impact"),
      start_date: z.string().optional().describe("Planned start date"),
      end_date: z.string().optional().describe("Planned end date"),
      template_id: z.string().optional().describe("Standard change template sys_id (required for standard type)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    CREATE,
    async ({ type, short_description, description, assignment_group, category, risk, impact, start_date, end_date, template_id, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (description) body.description = description;
        if (assignment_group) body.assignment_group = assignment_group;
        if (category) body.category = category;
        if (risk) body.risk = risk;
        if (impact) body.impact = impact;
        if (start_date) body.start_date = start_date;
        if (end_date) body.end_date = end_date;

        let apiPath: string;
        if (type === "standard" && template_id) {
          apiPath = `/api/sn_chg_rest/change/standard/${template_id}`;
        } else if (type === "emergency") {
          apiPath = `/api/sn_chg_rest/change/emergency`;
        } else {
          apiPath = `/api/sn_chg_rest/change/normal`;
        }

        const result = await client.restApi("POST", apiPath, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_change_update",
    "Update an existing change request",
    {
      sys_id: z.string().describe("Change request sys_id"),
      fields: z.record(z.string(), z.unknown()).describe("Field values to update"),
    },
    UPDATE,
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("change_request", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_change_task_create",
    "Create a change task (change_task) under a change request.",
    {
      change_request: z.string().describe("Parent change request sys_id"),
      short_description: z.string().describe("Short description of the task"),
      change_task_type: z.string().optional().describe("Task type (e.g. 'planning', 'implementation', 'testing', 'review')"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assignee sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ change_request, short_description, change_task_type, assignment_group, assigned_to, additional_fields }) => {
      try {
        const body: Record<string, unknown> = {
          change_request,
          short_description,
          ...(change_task_type ? { change_task_type } : {}),
          ...(assignment_group ? { assignment_group } : {}),
          ...(assigned_to ? { assigned_to } : {}),
          ...additional_fields,
        };
        const result = await client.create("change_task", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_change_conflict_check",
    "Run conflict detection for a change request via the Change Management API (POST /api/sn_chg_rest/change/{sys_id}/conflict). Recomputes scheduling/CI conflicts and returns them — better than reading stale change_conflict rows.",
    {
      sys_id: z.string().describe("Change request sys_id to check for conflicts"),
    },
    ACTION,
    async ({ sys_id }) => {
      try {
        const result = await client.restApi(
          "POST",
          `/api/sn_chg_rest/change/${encodeURIComponent(sys_id)}/conflict`
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
