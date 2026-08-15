import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerProblemTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_problem_list",
    "List problems with filters for priority, state, assignment group, category",
    {
      priority: z.enum(["1", "2", "3", "4"]).optional().describe("Priority: 1=Critical, 2=High, 3=Moderate, 4=Low"),
      state: z.string().optional().describe("State value (e.g., 101=New, 102=Assess, 103=RCA, 104=Fix, 106=Resolved, 107=Closed)"),
      assignment_group: z.string().optional().describe("Assignment group name (contains match)"),
      category: z.string().optional().describe("Category value"),
      active: z.boolean().optional().describe("Filter by active status"),
      known_error: z.boolean().optional().describe("Filter by known error flag"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ priority, state, assignment_group, category, active, known_error, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (priority) qp.push(`priority=${priority}`);
        if (state) qp.push(`problem_state=${state}`);
        if (assignment_group) qp.push(`assignment_group.nameLIKE${assignment_group}`);
        if (category) qp.push(`category=${category}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (known_error !== undefined) qp.push(`known_error=${known_error}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("problem", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,priority,problem_state,category,assignment_group,assigned_to,known_error,first_reported_by_task,opened_at,resolved_at,fix_notes,cause_notes,active,sys_updated_on",
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
    "sn_problem_get",
    "Get full problem details including related incidents and problem tasks",
    {
      sys_id: z.string().describe("Problem sys_id"),
    },
    async ({ sys_id }) => {
      try {
        const [problem, relatedIncidents, problemTasks] = await Promise.all([
          client.getById("problem", sys_id),
          client.query("incident", {
            sysparm_query: `problem_id=${sys_id}`,
            sysparm_fields: "sys_id,number,short_description,state,priority",
            sysparm_display_value: "true",
            sysparm_limit: 50,
          }),
          client.query("problem_task", {
            sysparm_query: `problem=${sys_id}`,
            sysparm_fields: "sys_id,number,short_description,state,assignment_group,assigned_to",
            sysparm_display_value: "true",
            sysparm_limit: 20,
          }),
        ]);
        return jsonResult({ problem, relatedIncidents: relatedIncidents.records, problemTasks: problemTasks.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_known_error_list",
    "List known errors — problems flagged as known_error=true with workarounds",
    {
      category: z.string().optional().describe("Category filter"),
      query: z.string().optional().describe("Search in short_description or workaround"),
      active: z.boolean().optional().describe("Filter by active (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ category, query, active, limit }) => {
      try {
        const qp: string[] = ["known_error=true"];
        if (category) qp.push(`category=${category}`);
        if (query) qp.push(`short_descriptionLIKE${query}^ORworkaroundLIKE${query}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("problem", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,problem_state,category,workaround,cause_notes,fix_notes,assignment_group,sys_updated_on",
          sysparm_limit: limit,
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
    "sn_problem_create",
    "Create a new problem record",
    {
      short_description: z.string().describe("Short description"),
      description: z.string().optional().describe("Full description"),
      category: z.string().optional().describe("Category"),
      impact: z.enum(["1", "2", "3"]).optional().describe("Impact"),
      urgency: z.enum(["1", "2", "3"]).optional().describe("Urgency"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      first_reported_by_task: z.string().optional().describe("First reported by task sys_id (e.g., incident)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    async ({ short_description, description, category, impact, urgency, assignment_group, first_reported_by_task, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (description) body.description = description;
        if (category) body.category = category;
        if (impact) body.impact = impact;
        if (urgency) body.urgency = urgency;
        if (assignment_group) body.assignment_group = assignment_group;
        if (first_reported_by_task) body.first_reported_by_task = first_reported_by_task;
        const result = await client.create("problem", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_problem_update",
    "Update an existing problem record",
    {
      sys_id: z.string().describe("Problem sys_id"),
      fields: z.record(z.string(), z.unknown()).describe("Field values to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("problem", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
