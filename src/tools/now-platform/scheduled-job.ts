import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerScheduledJobTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_scheduled_job_list",
    "List scheduled job definitions (sysauto_script) — recurring and one-time scheduled scripts",
    {
      name: z.string().optional().describe("Job name (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      run_type: z.string().optional().describe("Run type: on_demand, daily, weekly, monthly, periodically"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, run_type, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (run_type) qp.push(`run_type=${run_type}`);
        qp.push("ORDERBYname");

        const result = await client.query("sysauto_script", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,active,run_type,run_dayofweek,run_time,run_start,run_period,conditional,condition,sys_updated_on",
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
    "sn_scheduled_trigger_list",
    "List scheduled execution triggers (sys_trigger) — the runtime state of scheduled items. Shows what's queued, running, or stuck.",
    {
      state: z.enum(["0", "1", "2"]).optional().describe("State: 0=Ready, 1=Queued, 2=Running"),
      name: z.string().optional().describe("Trigger name (contains match)"),
      claimed_by: z.string().optional().describe("Node system_id that claimed the job"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, name, claimed_by, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (state) qp.push(`state=${state}`);
        if (name) qp.push(`nameLIKE${name}`);
        if (claimed_by) qp.push(`claimed_by=${claimed_by}`);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_trigger", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,state,claimed_by,next_action,run_count,process_duration,trigger_type,sys_updated_on,sys_updated_by",
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
    "sn_scheduled_stuck_jobs",
    "Find stuck or orphaned scheduled jobs — triggers that are running or queued on nodes that may no longer exist",
    {
      min_minutes: z.coerce.number().optional().describe("Minimum minutes a job has been running/queued (default 30)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ min_minutes, limit, offset }) => {
      try {
        const cutoff = new Date(Date.now() - (min_minutes ?? 30) * 60000).toISOString().replace("T", " ").slice(0, 19);

        // Get currently running/queued triggers updated before the cutoff
        const [stuckTriggers, activeNodes] = await Promise.all([
          client.query("sys_trigger", {
            sysparm_query: `stateIN1,2^sys_updated_on<=${cutoff}^ORDERBYsys_updated_on`,
            sysparm_fields: "sys_id,name,state,claimed_by,next_action,run_count,process_duration,sys_updated_on",
            sysparm_limit: limit,
            sysparm_offset: offset,
            sysparm_display_value: "true",
          }),
          client.query("sys_cluster_state", {
            sysparm_fields: "system_id,status",
            sysparm_limit: 50,
          }),
        ]);

        return jsonResult({
          stuckJobs: { count: stuckTriggers.records.length, records: stuckTriggers.records },
          activeNodes: activeNodes.records,
          note: "Compare claimed_by against active node system_ids to identify orphaned jobs",
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_scheduled_job_history",
    "Get recent execution history for a scheduled job by checking sys_trigger runs",
    {
      job_name: z.string().describe("Scheduled job name (exact or contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 10)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ job_name, limit, offset }) => {
      try {
        const result = await client.query("sys_trigger", {
          sysparm_query: `nameLIKE${job_name}^ORDERBYDESCsys_updated_on`,
          sysparm_fields: "sys_id,name,state,claimed_by,next_action,run_count,process_duration,trigger_type,sys_updated_on",
          sysparm_limit: limit ?? 10,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });

        // Also check syslog for job execution logs
        const logs = await client.query("syslog", {
          sysparm_query: `messageLIKE${job_name}^ORDERBYDESCsys_created_on`,
          sysparm_fields: "sys_id,level,source,message,sys_created_on",
          sysparm_limit: 10,
        });

        return jsonResult({
          triggers: { count: result.records.length, records: result.records },
          recentLogs: { count: logs.records.length, records: logs.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
