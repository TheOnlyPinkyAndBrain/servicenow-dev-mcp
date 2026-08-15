import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerPerformanceAnalyticsTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_pa_scorecards",
    "Retrieve Performance Analytics scorecard data for an indicator. Returns scores, breakdowns, targets, and trends.",
    {
      indicator_sys_id: z.string().describe("PA indicator sys_id (sysparm_uuid)"),
      breakdown: z.string().optional().describe("Breakdown sys_id for dimensional analysis"),
      sort_by: z.enum(["VALUE", "CHANGE", "CHANGE_PERC", "LABEL", "TARGET"]).optional().describe("Sort field"),
      sort_dir: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      display_value: z.boolean().optional().describe("Return formatted values (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Limit results per page"),
    },
    READ,
    async ({ indicator_sys_id, breakdown, sort_by, sort_dir, display_value, limit }) => {
      try {
        const params = new URLSearchParams();
        params.set("sysparm_uuid", indicator_sys_id);
        if (breakdown) params.set("sysparm_breakdown", breakdown);
        if (sort_by) params.set("sysparm_sortby", sort_by);
        if (sort_dir) params.set("sysparm_sortdir", sort_dir);
        if (display_value !== undefined) params.set("sysparm_display_value", String(display_value));
        else params.set("sysparm_display_value", "true");
        if (limit) params.set("sysparm_per_page", String(limit));

        const result = await client.restApi("GET", `/api/now/pa/scorecards?${params.toString()}`);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_pa_indicator_list",
    "List Performance Analytics indicators",
    {
      name: z.string().optional().describe("Indicator name (contains match)"),
      frequency: z.string().optional().describe("Collection frequency (daily, weekly, monthly)"),
      active: z.boolean().optional().describe("Active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ name, frequency, active, limit }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (frequency) qp.push(`frequency=${frequency}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYname");

        const result = await client.query("pa_indicators", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,frequency,direction,unit,aggregate,fact_table,active,sys_updated_on",
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
    "sn_pa_breakdown_list",
    "List Performance Analytics breakdowns (dimensions for drilling into indicators)",
    {
      name: z.string().optional().describe("Breakdown name (contains match)"),
      active: z.boolean().optional().describe("Active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ name, active, limit }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYname");

        const result = await client.query("pa_breakdowns", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,fact_table,dimension,active,sys_updated_on",
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
    "sn_pa_dashboard_list",
    "List Performance Analytics dashboards",
    {
      name: z.string().optional().describe("Dashboard name (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ name, active, limit }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const result = await client.query("pa_dashboards", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,owner,active,sys_updated_on",
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
    "sn_pa_widget_list",
    "List Performance Analytics widgets (pa_widgets) — the visualizations (scorecards, charts, dials) placed on PA dashboards, tied to an indicator and optional breakdown.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      indicator: z.string().optional().describe("Filter by indicator sys_id"),
      type: z.string().optional().describe("Filter by widget type"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, indicator, type, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (indicator) qp.push(`indicator=${indicator}`);
        if (type) qp.push(`type=${type}`);
        if (query) qp.push(query);
        qp.push("ORDERBYname");
        const result = await client.query("pa_widgets", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,type,indicator,breakdown,visualization,description,sys_updated_on",
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
    "sn_pa_target_list",
    "List Performance Analytics targets (pa_targets) — goal values set for an indicator (optionally per element/breakdown).",
    {
      indicator: z.string().optional().describe("Filter by indicator sys_id"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ indicator, active, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (indicator) qp.push(`indicator=${indicator}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_updated_on");
        const result = await client.query("pa_targets", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,display_name,indicator,element,breakdown,active,owner,sys_updated_on",
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
    "sn_pa_threshold_list",
    "List Performance Analytics thresholds (pa_thresholds) — conditional score bands that trigger colors/notes when an indicator crosses a value.",
    {
      indicator: z.string().optional().describe("Filter by indicator sys_id"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ indicator, active, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (indicator) qp.push(`indicator=${indicator}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (query) qp.push(query);
        qp.push("ORDERBYindicator");
        const result = await client.query("pa_thresholds", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,indicator,condition,value,display,active,sys_updated_on",
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
