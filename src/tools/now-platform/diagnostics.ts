import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerDiagnosticsTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_diag_cluster_nodes",
    "List cluster node status (sys_cluster_state) — shows all application nodes, their status, and build info",
    {
      limit: z.coerce.number().min(1).max(50).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ limit }) => {
      try {
        const result = await client.query("sys_cluster_state", {
          sysparm_query: "ORDERBYsystem_id",
          sysparm_fields: "sys_id,system_id,status,node_id,schedulers,most_recent_message,ready_to_failover,build_name,sys_updated_on",
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
    "sn_diag_events",
    "List diagnostic events (cache flushes, node starts, plugin activations) from diagnostic_event table",
    {
      name: z.string().optional().describe("Event name filter (e.g., 'cache.flush')"),
      detail: z.string().optional().describe("Detail text filter (contains match)"),
      created_after: z.string().optional().describe("Created after datetime"),
      created_before: z.string().optional().describe("Created before datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ name, detail, created_after, created_before, limit }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`name=${name}`);
        if (detail) qp.push(`detailLIKE${detail}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        if (created_before) qp.push(`sys_created_on<=${created_before}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("diagnostic_event", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,detail,node,sys_created_on",
          sysparm_limit: limit,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_diag_cache_flushes",
    "List recent cache flush events — shows when and why caches were flushed",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ limit }) => {
      try {
        const result = await client.query("sys_cache_flush", {
          sysparm_query: "ORDERBYDESCsys_created_on",
          sysparm_fields: "sys_id,name,category,sys_created_on,sys_created_by",
          sysparm_limit: limit,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_diag_slow_queries",
    "List slow queries that exceeded the 5-second execution threshold",
    {
      table: z.string().optional().describe("Table name filter"),
      min_duration: z.coerce.number().optional().describe("Minimum duration in ms"),
      created_after: z.string().optional().describe("Created after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ table, min_duration, created_after, limit }) => {
      try {
        const qp: string[] = [];
        if (table) qp.push(`tableLIKE${table}`);
        if (min_duration) qp.push(`duration>=${min_duration}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCduration");

        const result = await client.query("syslog_transaction", {
          sysparm_query: `response_time>=5000^${qp.join("^")}`,
          sysparm_fields: "sys_id,url,response_time,status,sys_created_on,sys_created_by",
          sysparm_limit: limit,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_diag_audit_trail",
    "Query audit trail (sys_audit) — shows field-level change history for any record",
    {
      document_key: z.string().optional().describe("Record sys_id"),
      tablename: z.string().optional().describe("Table name"),
      fieldname: z.string().optional().describe("Field name"),
      user: z.string().optional().describe("User who made the change"),
      created_after: z.string().optional().describe("Created after datetime"),
      created_before: z.string().optional().describe("Created before datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ document_key, tablename, fieldname, user, created_after, created_before, limit }) => {
      try {
        const qp: string[] = [];
        if (document_key) qp.push(`documentkey=${document_key}`);
        if (tablename) qp.push(`tablename=${tablename}`);
        if (fieldname) qp.push(`fieldname=${fieldname}`);
        if (user) qp.push(`user=${user}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        if (created_before) qp.push(`sys_created_on<=${created_before}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_audit", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,tablename,documentkey,fieldname,oldvalue,newvalue,user,sys_created_on",
          sysparm_limit: limit,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_diag_deleted_records",
    "Query deleted records audit trail (sys_audit_delete)",
    {
      tablename: z.string().optional().describe("Table name"),
      user: z.string().optional().describe("User who deleted"),
      created_after: z.string().optional().describe("Deleted after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ tablename, user, created_after, limit }) => {
      try {
        const qp: string[] = [];
        if (tablename) qp.push(`tablename=${tablename}`);
        if (user) qp.push(`user=${user}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_audit_delete", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,tablename,documentkey,display_value,user,sys_created_on",
          sysparm_limit: limit,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_diag_instance_scan_findings",
    "List instance scan findings — violations detected by the Instance Scan engine",
    {
      severity: z.string().optional().describe("Severity filter"),
      category: z.string().optional().describe("Category filter (performance, security, manageability)"),
      check: z.string().optional().describe("Scan check name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ severity, category, check, limit }) => {
      try {
        const qp: string[] = [];
        if (severity) qp.push(`severity=${severity}`);
        if (category) qp.push(`category=${category}`);
        if (check) qp.push(`scan_check.nameLIKE${check}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("scan_finding", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,scan_check,table,record_id,severity,category,description,resolution,sys_created_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
