import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerCmdbTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_cmdb_ci_list",
    "List Configuration Items from the CMDB (cmdb_ci or any CI subclass). Supports searching across any CI class like cmdb_ci_server, cmdb_ci_app_server, cmdb_ci_service, etc.",
    {
      ci_class: z.string().optional().describe("CI class table (default 'cmdb_ci'). Use subclasses like 'cmdb_ci_server', 'cmdb_ci_app_server', 'cmdb_ci_win_server', 'cmdb_ci_service'"),
      name: z.string().optional().describe("Filter by CI name (contains match)"),
      operational_status: z.string().optional().describe("Filter by operational status (1=Operational, 2=Non-Operational, etc.)"),
      environment: z.string().optional().describe("Filter by environment (e.g. 'Production', 'Development')"),
      support_group: z.string().optional().describe("Filter by support group name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ ci_class, name, operational_status, environment, support_group, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (operational_status) queryParts.push(`operational_status=${operational_status}`);
        if (environment) queryParts.push(`environment=${environment}`);
        if (support_group) queryParts.push(`support_group.nameLIKE${support_group}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");

        const result = await client.query(ci_class ?? "cmdb_ci", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,sys_class_name,operational_status,environment,support_group,owned_by,ip_address,category,subcategory,sys_updated_on",
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
    "sn_cmdb_ci_get",
    "Get full Configuration Item details by sys_id, including all attributes",
    {
      sys_id: z.string().describe("The sys_id of the CI"),
      ci_class: z.string().optional().describe("CI class table (default 'cmdb_ci'). Use the correct subclass for full attributes"),
    },
    async ({ sys_id, ci_class }) => {
      try {
        const record = await client.getById(ci_class ?? "cmdb_ci", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_cmdb_rel_list",
    "List CMDB relationships for a Configuration Item. Shows parent/child, runs on, hosted on, and other dependency relationships.",
    {
      ci_sys_id: z.string().describe("The sys_id of the CI to find relationships for"),
      direction: z.enum(["parent", "child", "both"]).optional().describe("Direction: 'parent' = CIs this depends on, 'child' = CIs that depend on this, 'both' (default)"),
      rel_type: z.string().optional().describe("Filter by relationship type name (contains match), e.g. 'Runs on', 'Hosted on'"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ ci_sys_id, direction, rel_type, limit }) => {
      try {
        const dir = direction ?? "both";
        const results: { parent?: unknown[]; child?: unknown[] } = {};

        if (dir === "parent" || dir === "both") {
          const queryParts: string[] = [`child=${ci_sys_id}`];
          if (rel_type) queryParts.push(`type.nameLIKE${rel_type}`);
          const parentRels = await client.query("cmdb_rel_ci", {
            sysparm_query: queryParts.join("^"),
            sysparm_fields: "sys_id,parent,child,type",
            sysparm_limit: limit ?? 50,
            sysparm_display_value: "true",
          });
          results.parent = parentRels.records;
        }

        if (dir === "child" || dir === "both") {
          const queryParts: string[] = [`parent=${ci_sys_id}`];
          if (rel_type) queryParts.push(`type.nameLIKE${rel_type}`);
          const childRels = await client.query("cmdb_rel_ci", {
            sysparm_query: queryParts.join("^"),
            sysparm_fields: "sys_id,parent,child,type",
            sysparm_limit: limit ?? 50,
            sysparm_display_value: "true",
          });
          results.child = childRels.records;
        }

        return jsonResult({ ciSysId: ci_sys_id, ...results });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_cmdb_class_list",
    "List CMDB CI classes (cmdb_ci hierarchy). Shows available CI types and their hierarchy.",
    {
      parent_class: z.string().optional().describe("Filter by parent class name, e.g. 'cmdb_ci' for direct children"),
      name: z.string().optional().describe("Filter by class name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ parent_class, name, limit }) => {
      try {
        const queryParts: string[] = [];
        if (parent_class) queryParts.push(`super_class.name=${parent_class}`);
        if (name) queryParts.push(`nameLIKE${name}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_db_object", {
          sysparm_query: `nameLIKEcmdb_ci^${queryParts.join("^")}`,
          sysparm_fields: "sys_id,name,label,super_class,is_extendable",
          sysparm_limit: limit ?? 50,
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
    "sn_cmdb_instance_get",
    "Get a Configuration Item via the CMDB Instance API (/api/now/cmdb/instance). Returns the CI's attributes plus its inbound and outbound relations in a single call — richer than sn_cmdb_ci_get, which returns table columns only.",
    {
      ci_class: z.string().describe("The CI class table name, e.g. 'cmdb_ci_linux_server', 'cmdb_ci_app_server'. Must be the specific class, not 'cmdb_ci'."),
      sys_id: z.string().describe("The sys_id of the CI"),
    },
    async ({ ci_class, sys_id }) => {
      try {
        const result = await client.restApi(
          "GET",
          `/api/now/cmdb/instance/${encodeURIComponent(ci_class)}/${encodeURIComponent(sys_id)}`
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // Write tools — only in develop mode
  if (mode !== "develop") return;

  server.tool(
    "sn_cmdb_instance_create",
    "Create a Configuration Item via the CMDB Instance API (POST /api/now/cmdb/instance/{class}). This routes through the Identification and Reconciliation Engine (IRE), so it deduplicates against existing CIs instead of blindly inserting. Prefer this over sn_table_create for CIs.",
    {
      ci_class: z.string().describe("The CI class table name, e.g. 'cmdb_ci_linux_server'"),
      attributes: z.record(z.unknown()).describe("CI field values, e.g. { name: 'web01', ip_address: '10.0.0.1', serial_number: 'ABC123' }"),
      source: z.string().describe("Required. The discovery/data source for the record — must be a valid 'discovery_source' choice value on the instance, e.g. 'ServiceNow'. The CMDB Instance API rejects the call without it."),
    },
    async ({ ci_class, attributes, source }) => {
      try {
        const body: Record<string, unknown> = { attributes, source };
        const result = await client.restApi(
          "POST",
          `/api/now/cmdb/instance/${encodeURIComponent(ci_class)}`,
          body
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_cmdb_instance_update",
    "Update a Configuration Item via the CMDB Instance API (PATCH /api/now/cmdb/instance/{class}/{sys_id}). Applies reconciliation rules so trusted sources aren't overwritten by less-trusted data.",
    {
      ci_class: z.string().describe("The CI class table name, e.g. 'cmdb_ci_linux_server'"),
      sys_id: z.string().describe("The sys_id of the CI to update"),
      attributes: z.record(z.unknown()).describe("CI field values to update, e.g. { operational_status: '1', comments: 'updated' }"),
      source: z.string().describe("Required. The discovery/data source for the update — must be a valid 'discovery_source' choice value on the instance, e.g. 'ServiceNow'."),
    },
    async ({ ci_class, sys_id, attributes, source }) => {
      try {
        const body: Record<string, unknown> = { attributes, source };
        const result = await client.restApi(
          "PATCH",
          `/api/now/cmdb/instance/${encodeURIComponent(ci_class)}/${encodeURIComponent(sys_id)}`,
          body
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_cmdb_identify_reconcile",
    "Create or update CIs and their relationships through the Identification and Reconciliation API (POST /api/now/identifyreconcile). This is the supported way to write CMDB data from an external source: IRE matches on identification rules to avoid duplicate CIs and enforces reconciliation. Use for bulk/multi-CI payloads with relations.",
    {
      items: z.array(z.record(z.unknown())).describe("Array of CI payloads. Each item: { className: 'cmdb_ci_linux_server', values: { name, ip_address, ... }, sys_object_source_info?: { source, source_native_key } }"),
      relations: z.array(z.record(z.unknown())).optional().describe("Optional relationships between items, e.g. [{ type: 'Runs on::Runs', parent: 0, child: 1 }] where parent/child index into items"),
      data_source: z.string().optional().describe("Value for sysparm_data_source query param identifying the writing source"),
    },
    async ({ items, relations, data_source }) => {
      try {
        const body: Record<string, unknown> = { items };
        if (relations) body.relations = relations;
        const path = data_source
          ? `/api/now/identifyreconcile?sysparm_data_source=${encodeURIComponent(data_source)}`
          : "/api/now/identifyreconcile";
        const result = await client.restApi("POST", path, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
