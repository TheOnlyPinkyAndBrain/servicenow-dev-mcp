import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerSecOpsTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_security_incident_list",
    "List security incidents (sn_si_incident)",
    {
      priority: z.enum(["1", "2", "3", "4"]).optional().describe("Priority"),
      state: z.string().optional().describe("State value"),
      category: z.string().optional().describe("Category"),
      subcategory: z.string().optional().describe("Subcategory"),
      assignment_group: z.string().optional().describe("Assignment group name (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ priority, state, category, subcategory, assignment_group, active, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (priority) qp.push(`priority=${priority}`);
        if (state) qp.push(`state=${state}`);
        if (category) qp.push(`category=${category}`);
        if (subcategory) qp.push(`subcategory=${subcategory}`);
        if (assignment_group) qp.push(`assignment_group.nameLIKE${assignment_group}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_si_incident", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,priority,state,category,subcategory,assignment_group,assigned_to,risk_score,attack_type,active,opened_at,sys_updated_on",
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
    "sn_security_incident_get",
    "Get full security incident details including observables and affected CIs",
    {
      sys_id: z.string().describe("Security incident sys_id"),
    },
    async ({ sys_id }) => {
      try {
        const [incident, observables, affectedCIs] = await Promise.all([
          client.getById("sn_si_incident", sys_id),
          client.query("sn_ti_observable", {
            sysparm_query: `security_incident=${sys_id}`,
            sysparm_fields: "sys_id,type,value,source_type,reputation,notes",
            sysparm_display_value: "true",
            sysparm_limit: 50,
          }),
          client.query("task_ci", {
            sysparm_query: `task=${sys_id}`,
            sysparm_fields: "sys_id,ci_item,ci_item.name,ci_item.sys_class_name",
            sysparm_display_value: "true",
            sysparm_limit: 50,
          }),
        ]);
        return jsonResult({ incident, observables: observables.records, affectedCIs: affectedCIs.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_vulnerability_list",
    "List vulnerable items (sn_vul_vulnerable_item) — CIs with known vulnerabilities",
    {
      severity: z.string().optional().describe("Vulnerability severity"),
      state: z.string().optional().describe("State filter"),
      cmdb_ci: z.string().optional().describe("CI name (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ severity, state, cmdb_ci, active, limit }) => {
      try {
        const qp: string[] = [];
        if (severity) qp.push(`severity=${severity}`);
        if (state) qp.push(`state=${state}`);
        if (cmdb_ci) qp.push(`cmdb_ci.nameLIKE${cmdb_ci}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYDESCseverity");

        const result = await client.query("sn_vul_vulnerable_item", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,vulnerability,cmdb_ci,severity,state,first_found,last_found,active,sys_updated_on",
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
    "sn_vulnerability_entry_list",
    "List vulnerability entries from NVD (sn_vul_nvd_entry)",
    {
      cvss_score_min: z.coerce.number().optional().describe("Minimum CVSS score"),
      text_search: z.string().optional().describe("Search in name or description"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ cvss_score_min, text_search, limit }) => {
      try {
        const qp: string[] = [];
        if (cvss_score_min) qp.push(`cvss_score>=${cvss_score_min}`);
        if (text_search) qp.push(`nameLIKE${text_search}^ORdescriptionLIKE${text_search}`);
        qp.push("ORDERBYDESCcvss_score");

        const result = await client.query("sn_vul_nvd_entry", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,cvss_score,severity,published_date,last_modified_date",
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
    "sn_threat_observable_list",
    "List threat intelligence observables (sn_ti_observable) — IPs, domains, file hashes flagged as threats",
    {
      type: z.string().optional().describe("Observable type (IP, Domain, URL, FileHash)"),
      value: z.string().optional().describe("Observable value (contains match)"),
      reputation: z.string().optional().describe("Reputation level"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ type, value, reputation, limit }) => {
      try {
        const qp: string[] = [];
        if (type) qp.push(`type=${type}`);
        if (value) qp.push(`valueLIKE${value}`);
        if (reputation) qp.push(`reputation=${reputation}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_ti_observable", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,type,value,reputation,source_type,notes,security_incident,sys_created_on",
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
    "sn_security_incident_create",
    "Create a security incident",
    {
      short_description: z.string().describe("Short description"),
      category: z.string().optional().describe("Category"),
      subcategory: z.string().optional().describe("Subcategory"),
      priority: z.enum(["1", "2", "3", "4"]).optional().describe("Priority"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    async ({ short_description, category, subcategory, priority, assignment_group, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (category) body.category = category;
        if (subcategory) body.subcategory = subcategory;
        if (priority) body.priority = priority;
        if (assignment_group) body.assignment_group = assignment_group;
        const result = await client.create("sn_si_incident", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_security_incident_update",
    "Update a security incident",
    {
      sys_id: z.string().describe("Security incident sys_id"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("sn_si_incident", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
