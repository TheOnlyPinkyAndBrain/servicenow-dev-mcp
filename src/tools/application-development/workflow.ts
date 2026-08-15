import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerWorkflowTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_workflow_list",
    "List legacy workflows (wf_workflow). Shows workflow name, table, and published status. Legacy workflows are still heavily used in many instances.",
    {
      name: z.string().optional().describe("Filter by workflow name (contains match)"),
      table: z.string().optional().describe("Filter by table name"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, table, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (table) queryParts.push(`table=${table}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("wf_workflow", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,table,description,active,sys_scope,sys_updated_on",
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
    "sn_workflow_get",
    "Get full workflow details by sys_id",
    {
      sys_id: z.string().describe("The sys_id of the workflow"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("wf_workflow", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_workflow_versions",
    "List workflow versions for a workflow. The published version is the one that runs. Useful for debugging which version of a workflow is active.",
    {
      workflow_sys_id: z.string().describe("The sys_id of the parent workflow"),
    },
    READ,
    async ({ workflow_sys_id }) => {
      try {
        const result = await client.query("wf_workflow_version", {
          sysparm_query: `workflow=${workflow_sys_id}^ORDERBYDESCsys_updated_on`,
          sysparm_fields: "sys_id,name,workflow,published,checked_out,checked_out_by,table,after_business_rules,sys_updated_on",
          sysparm_limit: 20,
          sysparm_display_value: "true",
        });

        return jsonResult({
          workflowSysId: workflow_sys_id,
          count: result.records.length,
          versions: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_workflow_activities",
    "List activities (steps) in a workflow version. Shows activity type, name, and execution order.",
    {
      version_sys_id: z.string().describe("The sys_id of the workflow version"),
    },
    READ,
    async ({ version_sys_id }) => {
      try {
        const result = await client.query("wf_activity", {
          sysparm_query: `workflow_version=${version_sys_id}^ORDERBYx`,
          sysparm_fields: "sys_id,name,activity_definition,x,y,state,out_of_date,sys_class_name",
          sysparm_limit: 100,
          sysparm_display_value: "true",
        });

        return jsonResult({
          versionSysId: version_sys_id,
          count: result.records.length,
          activities: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_workflow_context_list",
    "List running/completed workflow contexts (executions) for a record or workflow. Shows execution state, started/ended time. Essential for debugging workflow execution.",
    {
      workflow_sys_id: z.string().optional().describe("Filter by workflow sys_id"),
      table: z.string().optional().describe("Filter by table name of the record"),
      document_id: z.string().optional().describe("Filter by the sys_id of the record being processed"),
      state: z.enum(["executing", "finished", "cancelled"]).optional().describe("Filter by execution state"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ workflow_sys_id, table, document_id, state, limit }) => {
      try {
        const queryParts: string[] = [];
        if (workflow_sys_id) queryParts.push(`workflow.workflow=${workflow_sys_id}`);
        if (table) queryParts.push(`table=${table}`);
        if (document_id) queryParts.push(`id=${document_id}`);
        if (state) queryParts.push(`state=${state}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("wf_context", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,workflow,state,table,id,started,ended,result,active,sys_created_on",
          sysparm_limit: limit,
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
    "sn_workflow_execution_history",
    "Get execution history for a workflow context — shows which activities ran, their result, and timing. The key tool for debugging why a workflow took a specific path.",
    {
      context_sys_id: z.string().describe("The sys_id of the workflow context (execution)"),
    },
    READ,
    async ({ context_sys_id }) => {
      try {
        const result = await client.query("wf_history", {
          sysparm_query: `context=${context_sys_id}^ORDERBYstarted`,
          sysparm_fields: "sys_id,activity,activity_index,started,ended,result,output,state",
          sysparm_limit: 100,
          sysparm_display_value: "true",
        });

        return jsonResult({
          contextSysId: context_sys_id,
          count: result.records.length,
          history: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
