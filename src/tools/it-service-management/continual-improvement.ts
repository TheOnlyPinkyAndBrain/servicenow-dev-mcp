import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Continual Improvement Management (CIM). Requires the com.sn_cim plugin.
// Core objects: Improvement Initiative (sn_cim_register) and CIM Task (sn_cim_task).
export function registerCimTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_cim_initiative_list",
    "List Continual Improvement initiatives (sn_cim_register) — improvement records tracking a target outcome/KPI. Requires the Continual Improvement Management plugin (com.sn_cim).",
    {
      state: z.string().optional().describe("Filter by state"),
      type: z.string().optional().describe("Filter by type (e.g. 'Process', 'Service', 'Technology')"),
      assigned_to: z.string().optional().describe("Filter by assigned_to user sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, type, assigned_to, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (type) queryParts.push(`type=${type}`);
        if (assigned_to) queryParts.push(`assigned_to=${assigned_to}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_updated_on");
        const result = await client.query("sn_cim_register", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,type,priority,assigned_to,assignment_group,requested_for,target_date_time,sys_updated_on",
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
    "sn_cim_initiative_get",
    "Get a Continual Improvement initiative (sn_cim_register) by sys_id, together with its CIM tasks (sn_cim_task) and impacted KPIs (sn_cim_related_kpi).",
    {
      sys_id: z.string().describe("The sys_id of the improvement initiative"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [initiative, tasks, kpis] = await Promise.all([
          client.getById("sn_cim_register", sys_id),
          client.query("sn_cim_task", {
            sysparm_query: `parent=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,short_description,state,assigned_to,cim_task_type",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
          client.query("sn_cim_related_kpi", {
            sysparm_query: `cim_register=${sys_id}`,
            sysparm_fields: "sys_id,indicator,element,breakdown,view_scorecard",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
        ]);
        return jsonResult({
          initiative,
          tasks: tasks.records,
          taskCount: tasks.totalCount,
          impactedKpis: kpis.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_cim_task_list",
    "List Continual Improvement tasks (sn_cim_task) — work items under an improvement initiative. Requires the Continual Improvement Management plugin (com.sn_cim).",
    {
      parent: z.string().optional().describe("Filter by parent sys_id (an initiative or a parent CIM task)"),
      state: z.string().optional().describe("Filter by state"),
      assigned_to: z.string().optional().describe("Filter by assigned_to user sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ parent, state, assigned_to, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (parent) queryParts.push(`parent=${parent}`);
        if (state) queryParts.push(`state=${state}`);
        if (assigned_to) queryParts.push(`assigned_to=${assigned_to}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_updated_on");
        const result = await client.query("sn_cim_task", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,priority,assigned_to,assignment_group,parent,cim_task_type,sys_updated_on",
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
