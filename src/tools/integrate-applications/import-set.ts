import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerImportSetTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_import_set_list",
    "List import sets (sys_import_set). Shows import set name, table, state, and row counts. Useful for debugging data import issues.",
    {
      table_name: z.string().optional().describe("Filter by import set table name (contains match)"),
      state: z.string().optional().describe("Filter by state (e.g. 'loaded', 'transformed', 'error')"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table_name, state, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table_name) queryParts.push(`table_nameLIKE${table_name}`);
        if (state) queryParts.push(`state=${state}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_import_set", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,table_name,state,mode,loaded_count,inserted_count,updated_count,error_count,sys_created_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
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
    "sn_import_set_rows",
    "List import set rows for an import set. Shows individual row data, state, and any error messages.",
    {
      import_set: z.string().describe("sys_id of the import set"),
      state: z.string().optional().describe("Filter by row state (e.g. 'inserted', 'updated', 'error', 'ignored')"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ import_set, state, limit, offset }) => {
      try {
        // First get the import set to know the table
        const importSetResult = await client.query("sys_import_set", {
          sysparm_query: `sys_id=${import_set}`,
          sysparm_fields: "table_name",
          sysparm_limit: 1,
        });

        if (importSetResult.records.length === 0) {
          return jsonResult({ error: "Import set not found" });
        }

        const tableName = (importSetResult.records[0] as Record<string, string>).table_name;

        const queryParts: string[] = [`sys_import_set=${import_set}`];
        if (state) queryParts.push(`sys_import_state=${state}`);
        queryParts.push("ORDERBYsys_import_row");

        const result = await client.query(tableName, {
          sysparm_query: queryParts.join("^"),
          sysparm_limit: limit,
          sysparm_offset: offset,
        });

        return jsonResult({
          importSet: import_set,
          tableName,
          totalCount: result.totalCount,
          count: result.records.length,
          rows: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_transform_map_list",
    "List transform maps (sys_transform_map). Shows mapping between import set tables and target tables.",
    {
      source_table: z.string().optional().describe("Filter by source table (import set table)"),
      target_table: z.string().optional().describe("Filter by target table name"),
      name: z.string().optional().describe("Filter by transform map name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ source_table, target_table, name, active, limit }) => {
      try {
        const queryParts: string[] = [];
        if (source_table) queryParts.push(`source_table=${source_table}`);
        if (target_table) queryParts.push(`target_table=${target_table}`);
        if (name) queryParts.push(`nameLIKE${name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_transform_map", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,source_table,target_table,active,order,run_business_rules,enforce_mandatory_fields,sys_updated_on",
          sysparm_limit: limit,
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
    "sn_transform_map_get",
    "Get a transform map with all its field mappings. Shows how source columns map to target fields, including any transform scripts.",
    {
      sys_id: z.string().describe("The sys_id of the transform map"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [map, entries] = await Promise.all([
          client.getById("sys_transform_map", sys_id),
          client.query("sys_transform_entry", {
            sysparm_query: `map=${sys_id}^ORDERBYorder`,
            sysparm_fields: "sys_id,source_field,target_field,coalesce,use_source_script,source_script,choice_action,default_value,order",
            sysparm_limit: 100,
          }),
        ]);

        return jsonResult({
          transformMap: map,
          fieldMappings: entries.records,
          mappingCount: entries.totalCount,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_transform_map_scripts",
    "List transform scripts (onBefore, onAfter, onStart, onComplete, onForeignInsert) for a transform map",
    {
      transform_map_sys_id: z.string().describe("The sys_id of the transform map"),
    },
    READ,
    async ({ transform_map_sys_id }) => {
      try {
        const result = await client.query("sys_transform_script", {
          sysparm_query: `map=${transform_map_sys_id}^ORDERBYwhen`,
          sysparm_fields: "sys_id,map,when,script,active,order",
          sysparm_limit: 50,
        });

        return jsonResult({
          transformMapSysId: transform_map_sys_id,
          count: result.records.length,
          scripts: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_data_source_list",
    "List data sources (sys_data_source) — the import connectors (file, JDBC, REST, LDAP) that feed import set tables.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      type: z.string().optional().describe("Filter by source type (e.g. 'File', 'JDBC', 'REST')"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, type, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (type) queryParts.push(`type=${type}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");
        const result = await client.query("sys_data_source", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,type,format,import_set_table_name,file_retrieval_method,mid_server,last_run_datetime,sys_updated_on",
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
    "sn_scheduled_import_list",
    "List scheduled data imports (scheduled_import_set) — recurring jobs that pull from a data source and run a transform map.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");
        const result = await client.query("scheduled_import_set", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,data_source,map,active,run_type,record_source,sys_updated_on",
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
