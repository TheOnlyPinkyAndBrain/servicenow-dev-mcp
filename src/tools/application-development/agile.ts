import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, DELETE, READ, UPDATE } from "../../annotations.js";

export function registerAgileTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // ========== Stories (rm_story) ==========

  server.tool(
    "sn_story_list",
    "List Agile Development stories (rm_story).",
    {
      state: z.string().optional().describe("Filter by state (e.g. '1' Ready, '2' Work in Progress, '3' Complete)"),
      assignment_group: z.string().optional().describe("Filter by assignment group sys_id"),
      assigned_to: z.string().optional().describe("Filter by assigned user sys_id"),
      epic: z.string().optional().describe("Filter by parent epic sys_id"),
      project: z.string().optional().describe("Filter by parent project sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, assignment_group, assigned_to, epic, project, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (assignment_group) queryParts.push(`assignment_group=${assignment_group}`);
        if (assigned_to) queryParts.push(`assigned_to=${assigned_to}`);
        if (epic) queryParts.push(`epic=${epic}`);
        if (project) queryParts.push(`project=${project}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("rm_story", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,priority,story_points,epic,project,assignment_group,assigned_to,sys_updated_on",
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
    "sn_story_dependency_list",
    "List story dependencies (m2m_story_dependencies) — which stories block or depend on which.",
    {
      dependent_story: z.string().optional().describe("Filter by dependent story sys_id"),
      prerequisite_story: z.string().optional().describe("Filter by prerequisite story sys_id"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ dependent_story, prerequisite_story, limit }) => {
      try {
        const queryParts: string[] = [];
        if (dependent_story) queryParts.push(`dependent_story=${dependent_story}`);
        if (prerequisite_story) queryParts.push(`prerequisite_story=${prerequisite_story}`);

        const result = await client.query("m2m_story_dependencies", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,dependent_story,prerequisite_story",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });

        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Epics (rm_epic) ==========

  server.tool(
    "sn_epic_list",
    "List Agile Development epics (rm_epic).",
    {
      state: z.string().optional().describe("Filter by state"),
      priority: z.string().optional().describe("Filter by priority"),
      assignment_group: z.string().optional().describe("Filter by assignment group sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, priority, assignment_group, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (priority) queryParts.push(`priority=${priority}`);
        if (assignment_group) queryParts.push(`assignment_group=${assignment_group}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("rm_epic", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,priority,assignment_group,assigned_to,sys_updated_on",
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

  // ========== Scrum Tasks (rm_scrum_task) ==========

  server.tool(
    "sn_scrum_task_list",
    "List Agile Development scrum tasks (rm_scrum_task) — the work breakdown for a story.",
    {
      story: z.string().optional().describe("Filter by parent story sys_id"),
      state: z.string().optional().describe("Filter by state"),
      assigned_to: z.string().optional().describe("Filter by assigned user sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ story, state, assigned_to, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (story) queryParts.push(`story=${story}`);
        if (state) queryParts.push(`state=${state}`);
        if (assigned_to) queryParts.push(`assigned_to=${assigned_to}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("rm_scrum_task", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,story,state,priority,type,planned_hours,remaining_hours,assigned_to,sys_updated_on",
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

  // ========== Projects (pm_project) ==========

  server.tool(
    "sn_project_list",
    "List Agile/Project Management projects (pm_project).",
    {
      state: z.string().optional().describe("Filter by state"),
      status: z.string().optional().describe("Filter by status (green/yellow/red)"),
      project_manager: z.string().optional().describe("Filter by project manager sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, status, project_manager, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (status) queryParts.push(`status=${status}`);
        if (project_manager) queryParts.push(`project_manager=${project_manager}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("pm_project", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,status,percent_complete,project_manager,assignment_group,start_date,end_date,sys_updated_on",
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

  // ========== Story writes ==========

  server.tool(
    "sn_story_create",
    "Create a new Agile Development story (rm_story).",
    {
      short_description: z.string().describe("Short description of the story"),
      acceptance_criteria: z.string().optional().describe("Acceptance criteria for the story"),
      description: z.string().optional().describe("Detailed description"),
      state: z.string().optional().describe("State (-6 Draft, -7 Ready for Testing, -8 Testing, 1 Ready, 2 Work in Progress, 3 Complete, 4 Cancelled)"),
      priority: z.string().optional().describe("Priority"),
      story_points: z.coerce.number().optional().describe("Story points"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned user sys_id"),
      epic: z.string().optional().describe("Parent epic sys_id"),
      project: z.string().optional().describe("Parent project sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ short_description, acceptance_criteria, description, state, priority, story_points, assignment_group, assigned_to, epic, project, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (acceptance_criteria) body.acceptance_criteria = acceptance_criteria;
        if (description) body.description = description;
        if (state) body.state = state;
        if (priority) body.priority = priority;
        if (story_points !== undefined) body.story_points = story_points;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;
        if (epic) body.epic = epic;
        if (project) body.project = project;

        const result = await client.create("rm_story", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_story_update",
    "Update an existing Agile Development story (rm_story).",
    {
      sys_id: z.string().describe("sys_id of the story to update"),
      short_description: z.string().optional().describe("Short description of the story"),
      acceptance_criteria: z.string().optional().describe("Acceptance criteria for the story"),
      description: z.string().optional().describe("Detailed description"),
      state: z.string().optional().describe("State (-6 Draft, -7 Ready for Testing, -8 Testing, 1 Ready, 2 Work in Progress, 3 Complete, 4 Cancelled)"),
      priority: z.string().optional().describe("Priority"),
      story_points: z.coerce.number().optional().describe("Story points"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned user sys_id"),
      epic: z.string().optional().describe("Parent epic sys_id"),
      project: z.string().optional().describe("Parent project sys_id"),
      work_notes: z.string().optional().describe("Work note to add"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, short_description, acceptance_criteria, description, state, priority, story_points, assignment_group, assigned_to, epic, project, work_notes, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (short_description) body.short_description = short_description;
        if (acceptance_criteria) body.acceptance_criteria = acceptance_criteria;
        if (description) body.description = description;
        if (state) body.state = state;
        if (priority) body.priority = priority;
        if (story_points !== undefined) body.story_points = story_points;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;
        if (epic) body.epic = epic;
        if (project) body.project = project;
        if (work_notes) body.work_notes = work_notes;

        const result = await client.update("rm_story", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_story_dependency_create",
    "Create a dependency between two stories (m2m_story_dependencies) — marks one story as a prerequisite for another.",
    {
      dependent_story: z.string().describe("sys_id of the story that depends on the other"),
      prerequisite_story: z.string().describe("sys_id of the story that must complete first"),
    },
    CREATE,
    async ({ dependent_story, prerequisite_story }) => {
      try {
        const result = await client.create("m2m_story_dependencies", { dependent_story, prerequisite_story });
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_story_dependency_delete",
    "Delete a story dependency (m2m_story_dependencies) by sys_id.",
    {
      sys_id: z.string().describe("sys_id of the dependency record to delete (from sn_story_dependency_list)"),
    },
    DELETE,
    async ({ sys_id }) => {
      try {
        await client.delete("m2m_story_dependencies", sys_id);
        return jsonResult({ success: true, message: "Story dependency deleted" });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Epic writes ==========

  server.tool(
    "sn_epic_create",
    "Create a new Agile Development epic (rm_epic).",
    {
      short_description: z.string().describe("Short description of the epic"),
      description: z.string().optional().describe("Detailed description"),
      priority: z.string().optional().describe("Priority (1 Critical, 2 High, 3 Moderate, 4 Low, 5 Planning)"),
      state: z.string().optional().describe("State (-6 Draft, 1 Ready, 2 Work in Progress, 3 Complete, 4 Cancelled)"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned user sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ short_description, description, priority, state, assignment_group, assigned_to, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (description) body.description = description;
        if (priority) body.priority = priority;
        if (state) body.state = state;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;

        const result = await client.create("rm_epic", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_epic_update",
    "Update an existing Agile Development epic (rm_epic).",
    {
      sys_id: z.string().describe("sys_id of the epic to update"),
      short_description: z.string().optional().describe("Short description of the epic"),
      description: z.string().optional().describe("Detailed description"),
      priority: z.string().optional().describe("Priority (1 Critical, 2 High, 3 Moderate, 4 Low, 5 Planning)"),
      state: z.string().optional().describe("State (-6 Draft, 1 Ready, 2 Work in Progress, 3 Complete, 4 Cancelled)"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned user sys_id"),
      work_notes: z.string().optional().describe("Work note to add"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, short_description, description, priority, state, assignment_group, assigned_to, work_notes, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (short_description) body.short_description = short_description;
        if (description) body.description = description;
        if (priority) body.priority = priority;
        if (state) body.state = state;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;
        if (work_notes) body.work_notes = work_notes;

        const result = await client.update("rm_epic", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Scrum task writes ==========

  server.tool(
    "sn_scrum_task_create",
    "Create a new scrum task (rm_scrum_task) under a story.",
    {
      story: z.string().describe("sys_id of the parent story"),
      short_description: z.string().describe("Short description of the scrum task"),
      description: z.string().optional().describe("Detailed description"),
      priority: z.string().optional().describe("Priority (1 Critical, 2 High, 3 Moderate, 4 Low)"),
      type: z.string().optional().describe("Type (1 Analysis, 2 Coding, 3 Documentation, 4 Testing)"),
      state: z.string().optional().describe("State (-6 Draft, 1 Ready, 2 Work in Progress, 3 Complete, 4 Cancelled)"),
      planned_hours: z.coerce.number().optional().describe("Planned hours"),
      remaining_hours: z.coerce.number().optional().describe("Remaining hours"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned user sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ story, short_description, description, priority, type, state, planned_hours, remaining_hours, assignment_group, assigned_to, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { story, short_description, ...additional_fields };
        if (description) body.description = description;
        if (priority) body.priority = priority;
        if (type) body.type = type;
        if (state) body.state = state;
        if (planned_hours !== undefined) body.planned_hours = planned_hours;
        if (remaining_hours !== undefined) body.remaining_hours = remaining_hours;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;

        const result = await client.create("rm_scrum_task", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_scrum_task_update",
    "Update an existing scrum task (rm_scrum_task).",
    {
      sys_id: z.string().describe("sys_id of the scrum task to update"),
      short_description: z.string().optional().describe("Short description of the scrum task"),
      description: z.string().optional().describe("Detailed description"),
      priority: z.string().optional().describe("Priority (1 Critical, 2 High, 3 Moderate, 4 Low)"),
      type: z.string().optional().describe("Type (1 Analysis, 2 Coding, 3 Documentation, 4 Testing)"),
      state: z.string().optional().describe("State (-6 Draft, 1 Ready, 2 Work in Progress, 3 Complete, 4 Cancelled)"),
      planned_hours: z.coerce.number().optional().describe("Planned hours"),
      remaining_hours: z.coerce.number().optional().describe("Remaining hours"),
      hours: z.coerce.number().optional().describe("Actual hours worked"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned user sys_id"),
      work_notes: z.string().optional().describe("Work note to add"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, short_description, description, priority, type, state, planned_hours, remaining_hours, hours, assignment_group, assigned_to, work_notes, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (short_description) body.short_description = short_description;
        if (description) body.description = description;
        if (priority) body.priority = priority;
        if (type) body.type = type;
        if (state) body.state = state;
        if (planned_hours !== undefined) body.planned_hours = planned_hours;
        if (remaining_hours !== undefined) body.remaining_hours = remaining_hours;
        if (hours !== undefined) body.hours = hours;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;
        if (work_notes) body.work_notes = work_notes;

        const result = await client.update("rm_scrum_task", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Project writes ==========

  server.tool(
    "sn_project_create",
    "Create a new project (pm_project).",
    {
      short_description: z.string().describe("Project name"),
      description: z.string().optional().describe("Detailed description"),
      status: z.string().optional().describe("Status (green/yellow/red)"),
      state: z.string().optional().describe("State (-5 Pending, 1 Open, 2 Work in Progress, 3 Closed Complete, 4 Closed Incomplete, 5 Closed Skipped)"),
      project_manager: z.string().optional().describe("Project manager sys_id"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned user sys_id"),
      start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ short_description, description, status, state, project_manager, assignment_group, assigned_to, start_date, end_date, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (description) body.description = description;
        if (status) body.status = status;
        if (state) body.state = state;
        if (project_manager) body.project_manager = project_manager;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;
        if (start_date) body.start_date = start_date;
        if (end_date) body.end_date = end_date;

        const result = await client.create("pm_project", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_project_update",
    "Update an existing project (pm_project).",
    {
      sys_id: z.string().describe("sys_id of the project to update"),
      short_description: z.string().optional().describe("Project name"),
      description: z.string().optional().describe("Detailed description"),
      status: z.string().optional().describe("Status (green/yellow/red)"),
      state: z.string().optional().describe("State (-5 Pending, 1 Open, 2 Work in Progress, 3 Closed Complete, 4 Closed Incomplete, 5 Closed Skipped)"),
      project_manager: z.string().optional().describe("Project manager sys_id"),
      percent_complete: z.coerce.number().optional().describe("Percentage complete"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      assigned_to: z.string().optional().describe("Assigned user sys_id"),
      start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, short_description, description, status, state, project_manager, percent_complete, assignment_group, assigned_to, start_date, end_date, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (short_description) body.short_description = short_description;
        if (description) body.description = description;
        if (status) body.status = status;
        if (state) body.state = state;
        if (project_manager) body.project_manager = project_manager;
        if (percent_complete !== undefined) body.percent_complete = percent_complete;
        if (assignment_group) body.assignment_group = assignment_group;
        if (assigned_to) body.assigned_to = assigned_to;
        if (start_date) body.start_date = start_date;
        if (end_date) body.end_date = end_date;

        const result = await client.update("pm_project", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
