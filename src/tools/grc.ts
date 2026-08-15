import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerGrcTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_grc_policy_list",
    "List GRC policies (sn_grc_policy)",
    {
      name: z.string().optional().describe("Policy name (contains match)"),
      state: z.string().optional().describe("State filter"),
      active: z.boolean().optional().describe("Active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, state, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (state) qp.push(`state=${state}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYname");

        const result = await client.query("sn_grc_policy", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,state,owner,category,review_date,active,sys_updated_on",
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
    "sn_grc_control_list",
    "List GRC controls (sn_grc_control) — controls mapped to policies and profiles",
    {
      name: z.string().optional().describe("Control name (contains match)"),
      policy: z.string().optional().describe("Policy sys_id"),
      state: z.string().optional().describe("State filter"),
      active: z.boolean().optional().describe("Active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, policy, state, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (policy) qp.push(`policy=${policy}`);
        if (state) qp.push(`state=${state}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYname");

        const result = await client.query("sn_grc_control", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,policy,state,owner,type,category,control_environment,effectiveness,active,sys_updated_on",
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
    "sn_grc_risk_list",
    "List risks (sn_risk_risk) — risk register entries",
    {
      name: z.string().optional().describe("Risk name (contains match)"),
      state: z.string().optional().describe("State filter"),
      risk_score_min: z.coerce.number().optional().describe("Minimum risk score"),
      category: z.string().optional().describe("Category"),
      owner: z.string().optional().describe("Owner name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, state, risk_score_min, category, owner, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (state) qp.push(`state=${state}`);
        if (risk_score_min) qp.push(`residual_risk>=${risk_score_min}`);
        if (category) qp.push(`category=${category}`);
        if (owner) qp.push(`owner.nameLIKE${owner}`);
        qp.push("ORDERBYDESCresidual_risk");

        const result = await client.query("sn_risk_risk", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,state,category,owner,inherent_risk,residual_risk,risk_response,profile,sys_updated_on",
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
    "sn_grc_audit_list",
    "List audit engagements (sn_audit_engagement)",
    {
      name: z.string().optional().describe("Engagement name (contains match)"),
      state: z.string().optional().describe("State filter"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, state, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (state) qp.push(`state=${state}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_audit_engagement", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,short_description,state,owner,start_date,end_date,active,sys_updated_on",
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
    "sn_grc_finding_list",
    "List GRC findings — issues discovered during audits, attestations, or control tests",
    {
      state: z.string().optional().describe("State filter"),
      severity: z.string().optional().describe("Severity filter"),
      profile: z.string().optional().describe("Profile name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ state, severity, profile, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (state) qp.push(`state=${state}`);
        if (severity) qp.push(`severity=${severity}`);
        if (profile) qp.push(`profile.nameLIKE${profile}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_grc_finding", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,severity,profile,owner,recommendation,remediation_plan,sys_updated_on",
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
    "sn_grc_risk_create",
    "Create a risk entry",
    {
      name: z.string().describe("Risk name"),
      description: z.string().optional().describe("Description"),
      category: z.string().optional().describe("Category"),
      owner: z.string().optional().describe("Owner sys_id"),
      profile: z.string().optional().describe("GRC profile sys_id"),
      additional_fields: z.record(z.unknown()).optional().describe("Additional fields"),
    },
    async ({ name, description, category, owner, profile, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { name, ...additional_fields };
        if (description) body.description = description;
        if (category) body.category = category;
        if (owner) body.owner = owner;
        if (profile) body.profile = profile;
        const result = await client.create("sn_risk_risk", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
