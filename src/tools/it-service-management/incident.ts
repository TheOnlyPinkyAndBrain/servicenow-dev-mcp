import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

export function registerIncidentTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_incident_list",
    "List incidents with filters for priority, state, assignment group, assigned_to, category, and time range",
    {
      priority: z.enum(["1", "2", "3", "4", "5"]).optional().describe("Priority: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning"),
      state: z.enum(["1", "2", "3", "6", "7", "8"]).optional().describe("State: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed, 8=Canceled"),
      assignment_group: z.string().optional().describe("Assignment group name (contains match)"),
      assigned_to: z.string().optional().describe("Assigned to user name (contains match)"),
      category: z.string().optional().describe("Category value"),
      caller: z.string().optional().describe("Caller name (contains match)"),
      opened_after: z.string().optional().describe("Opened after datetime, e.g. '2024-01-01 00:00:00'"),
      opened_before: z.string().optional().describe("Opened before datetime"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ priority, state, assignment_group, assigned_to, category, caller, opened_after, opened_before, active, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (priority) qp.push(`priority=${priority}`);
        if (state) qp.push(`state=${state}`);
        if (assignment_group) qp.push(`assignment_group.nameLIKE${assignment_group}`);
        if (assigned_to) qp.push(`assigned_to.nameLIKE${assigned_to}`);
        if (category) qp.push(`category=${category}`);
        if (caller) qp.push(`caller_id.nameLIKE${caller}`);
        if (opened_after) qp.push(`opened_at>=${opened_after}`);
        if (opened_before) qp.push(`opened_at<=${opened_before}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("incident", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,priority,state,category,subcategory,assignment_group,assigned_to,caller_id,opened_at,resolved_at,closed_at,impact,urgency,severity,active,sys_updated_on",
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
    "sn_incident_get",
    "Get full incident details including related records (child incidents, tasks, SLAs, comments). Look up by sys_id or by the human-readable incident number (e.g. 'INC0010023').",
    {
      sys_id: z.string().optional().describe("Incident sys_id"),
      number: z.string().optional().describe("Incident number (e.g. 'INC0010023'), used if sys_id is not provided"),
    },
    READ,
    async ({ sys_id, number }) => {
      try {
        if (!sys_id && !number) {
          return errorResult(new Error("Provide either sys_id or number"));
        }
        if (!sys_id) {
          const lookup = await client.query("incident", {
            sysparm_query: `number=${number}`,
            sysparm_fields: "sys_id",
            sysparm_limit: 1,
          });
          if (!lookup.records.length) {
            return errorResult(new Error(`No incident found with number ${number}`));
          }
          sys_id = lookup.records[0].sys_id as string;
        }

        const [incident, childIncidents, taskSlas, comments] = await Promise.all([
          client.getById("incident", sys_id),
          client.query("incident", {
            sysparm_query: `parent_incident=${sys_id}`,
            sysparm_fields: "sys_id,number,short_description,state,priority",
            sysparm_display_value: "true",
            sysparm_limit: 20,
          }),
          client.query("task_sla", {
            sysparm_query: `task=${sys_id}`,
            sysparm_fields: "sys_id,sla,stage,has_breached,start_time,end_time,percentage",
            sysparm_display_value: "true",
            sysparm_limit: 10,
          }),
          client.query("sys_journal_field", {
            sysparm_query: `element_id=${sys_id}^elementINwork_notes,comments^ORDERBYDESCsys_created_on`,
            sysparm_fields: "sys_id,element,value,sys_created_on,sys_created_by",
            sysparm_limit: 20,
          }),
        ]);

        return jsonResult({
          incident,
          childIncidents: childIncidents.records,
          taskSlas: taskSlas.records,
          recentComments: comments.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_incident_related_cis",
    "Get configuration items related to an incident via the task_ci relationship table",
    {
      sys_id: z.string().describe("Incident sys_id"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const result = await client.query("task_ci", {
          sysparm_query: `task=${sys_id}`,
          sysparm_fields: "sys_id,ci_item,ci_item.name,ci_item.sys_class_name",
          sysparm_display_value: "true",
          sysparm_limit: 50,
        });
        return jsonResult({ count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_incident_major_list",
    "List major incidents (priority 1 or 2, or those flagged as major_incident_state)",
    {
      state: z.string().optional().describe("Filter by major incident state"),
      active: z.boolean().optional().describe("Filter by active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ state, active, limit }) => {
      try {
        const qp: string[] = ["priorityIN1,2"];
        if (state) qp.push(`major_incident_state=${state}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYDESCopened_at");

        const result = await client.query("incident", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,priority,state,major_incident_state,assignment_group,assigned_to,opened_at,business_impact",
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
    "sn_incident_task_list",
    "List incident tasks (incident_task) — sub-tasks created under an incident for parallel/assigned work.",
    {
      incident: z.string().optional().describe("Filter by parent incident sys_id"),
      state: z.string().optional().describe("Filter by state"),
      assignment_group: z.string().optional().describe("Filter by assignment group name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ incident, state, assignment_group, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (incident) queryParts.push(`incident=${incident}`);
        if (state) queryParts.push(`state=${state}`);
        if (assignment_group) queryParts.push(`assignment_group.nameLIKE${assignment_group}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");
        const result = await client.query("incident_task", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,incident,state,short_description,assigned_to,assignment_group,sys_created_on,sys_updated_on",
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
    "sn_incident_create",
    "Create a new incident",
    {
      short_description: z.string().describe("Short description of the incident"),
      description: z.string().optional().describe("Full description"),
      caller_id: z.string().optional().describe("Caller sys_id or user_name"),
      category: z.string().optional().describe("Category"),
      subcategory: z.string().optional().describe("Subcategory"),
      impact: z.enum(["1", "2", "3"]).optional().describe("Impact: 1=High, 2=Medium, 3=Low"),
      urgency: z.enum(["1", "2", "3"]).optional().describe("Urgency: 1=High, 2=Medium, 3=Low"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned to user sys_id"),
      cmdb_ci: z.string().optional().describe("Configuration item sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ short_description, description, caller_id, category, subcategory, impact, urgency, assignment_group, assigned_to, cmdb_ci, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (description) body.description = description;
        if (caller_id) body.caller_id = caller_id;
        if (category) body.category = category;
        if (subcategory) body.subcategory = subcategory;
        if (impact) body.impact = impact;
        if (urgency) body.urgency = urgency;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;
        if (cmdb_ci) body.cmdb_ci = cmdb_ci;

        const result = await client.create("incident", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_incident_update",
    "Update an existing incident",
    {
      sys_id: z.string().describe("Incident sys_id"),
      fields: z.record(z.string(), z.unknown()).describe("Field values to update (e.g., state, assigned_to, work_notes)"),
    },
    UPDATE,
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("incident", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
