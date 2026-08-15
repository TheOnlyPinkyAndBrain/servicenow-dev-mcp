import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ, UPDATE } from "../../annotations.js";

export function registerApprovalTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_approval_list",
    "List approval records (sysapproval_approver). Filter by state, approver, task, or time range.",
    {
      state: z.enum(["requested", "approved", "rejected", "cancelled", "not requested", "not_required"]).optional().describe("Approval state"),
      approver: z.string().optional().describe("Approver user name (contains match)"),
      document_id: z.string().optional().describe("Task/document sys_id being approved"),
      source_table: z.string().optional().describe("Source table name (e.g., change_request, sc_request)"),
      created_after: z.string().optional().describe("Created after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, approver, document_id, source_table, created_after, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (state) qp.push(`state=${state}`);
        if (approver) qp.push(`approver.nameLIKE${approver}`);
        if (document_id) qp.push(`document_id=${document_id}`);
        if (source_table) qp.push(`source_table=${source_table}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sysapproval_approver", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,approver,state,document_id,source_table,comments,expected_start,wf_activity,due_date,sys_created_on,sys_updated_on",
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
    "sn_approval_pending_for_user",
    "List pending approvals for a specific user",
    {
      user: z.string().describe("User name or sys_id"),
      source_table: z.string().optional().describe("Filter by source table"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ user, source_table, limit }) => {
      try {
        const isId = /^[a-f0-9]{32}$/.test(user);
        const qp: string[] = [
          `state=requested`,
          isId ? `approver=${user}` : `approver.nameLIKE${user}`,
        ];
        if (source_table) qp.push(`source_table=${source_table}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sysapproval_approver", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,approver,state,document_id,source_table,comments,due_date,sys_created_on",
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
    "sn_approval_for_task",
    "Get all approval records for a specific task/document with full history",
    {
      document_id: z.string().describe("Task sys_id"),
    },
    READ,
    async ({ document_id }) => {
      try {
        const [approvals, groupApprovals] = await Promise.all([
          client.query("sysapproval_approver", {
            sysparm_query: `document_id=${document_id}^ORDERBYDESCsys_updated_on`,
            sysparm_fields: "sys_id,approver,state,comments,expected_start,wf_activity,due_date,sys_created_on,sys_updated_on",
            sysparm_display_value: "true",
            sysparm_limit: 50,
          }),
          client.query("sysapproval_group", {
            sysparm_query: `parent=${document_id}`,
            sysparm_fields: "sys_id,assignment_group,approval,comments,due_date,sys_updated_on",
            sysparm_display_value: "true",
            sysparm_limit: 50,
          }),
        ]);
        return jsonResult({
          approvals: { count: approvals.records.length, records: approvals.records },
          groupApprovals: { count: groupApprovals.records.length, records: groupApprovals.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_delegation_list",
    "List user delegation assignments (sys_user_delegate)",
    {
      delegate: z.string().optional().describe("Delegate user name (contains match)"),
      user: z.string().optional().describe("Delegating user name (contains match)"),
      active: z.boolean().optional().describe("Active only (within date range)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ delegate, user, active, limit }) => {
      try {
        const qp: string[] = [];
        if (delegate) qp.push(`delegate.nameLIKE${delegate}`);
        if (user) qp.push(`user.nameLIKE${user}`);
        if (active) {
          const now = new Date().toISOString().replace("T", " ").slice(0, 19);
          qp.push(`starts<=${now}^ends>=${now}`);
        }
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_user_delegate", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,user,delegate,starts,ends,sys_updated_on",
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
    "sn_approval_stale",
    "Find stale approvals — requests that have been pending for more than N days",
    {
      days: z.coerce.number().min(1).describe("Number of days threshold"),
      source_table: z.string().optional().describe("Filter by source table"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ days, source_table, limit }) => {
      try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString().replace("T", " ").slice(0, 19);
        const qp: string[] = [
          `state=requested`,
          `sys_created_on<=${cutoff}`,
        ];
        if (source_table) qp.push(`source_table=${source_table}`);
        qp.push("ORDERBYsys_created_on");

        const result = await client.query("sysapproval_approver", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,approver,state,document_id,source_table,due_date,sys_created_on",
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
    "sn_approval_update",
    "Update an approval record (approve, reject, etc.)",
    {
      sys_id: z.string().describe("Approval sys_id"),
      state: z.enum(["approved", "rejected"]).describe("New state"),
      comments: z.string().optional().describe("Approval comments"),
    },
    UPDATE,
    async ({ sys_id, state, comments }) => {
      try {
        const body: Record<string, unknown> = { state };
        if (comments) body.comments = comments;
        const result = await client.update("sysapproval_approver", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
