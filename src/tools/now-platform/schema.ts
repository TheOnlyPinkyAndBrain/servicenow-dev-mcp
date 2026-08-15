import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerSchemaTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_schema_tables",
    "List or search ServiceNow tables (sys_db_object). Find tables by name or label. Returns table name, label, super_class, scope, and whether it's extendable.",
    {
      name: z.string().optional().describe("Filter by table name (contains match), e.g. 'incident'"),
      label: z.string().optional().describe("Filter by table label (contains match)"),
      super_class: z.string().optional().describe("Filter by parent table name to find child tables"),
      scope: z.string().optional().describe("Filter by application scope"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, label, super_class, scope, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (label) queryParts.push(`labelLIKE${label}`);
        if (super_class) queryParts.push(`super_class.name=${super_class}`);
        if (scope) queryParts.push(`sys_scope.name=${scope}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_db_object", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,label,super_class,is_extendable,sys_scope,number_ref,sys_updated_on",
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
    "sn_schema_columns",
    "List all columns/fields for a ServiceNow table (sys_dictionary). Returns field name, label, type, max length, mandatory, reference table, default value, and more. Essential for understanding a table's data model.",
    {
      table: z.string().describe("Table name to get columns for, e.g. 'incident'"),
      column_name: z.string().optional().describe("Filter by specific column name"),
      type: z.string().optional().describe("Filter by internal type (e.g. 'reference', 'string', 'integer', 'boolean', 'journal')"),
      include_inherited: z.boolean().optional().describe("Include fields inherited from parent tables (default true)"),
      limit: z.coerce.number().min(1).max(200).optional().describe("Max records (default 100)"),
    },
    READ,
    async ({ table, column_name, type, include_inherited, limit }) => {
      try {
        const queryParts: string[] = [];
        if (include_inherited === false) {
          queryParts.push(`name=${table}`);
        } else {
          // Include parent table fields by querying the element list
          queryParts.push(`name=${table}`);
        }
        if (column_name) queryParts.push(`elementLIKE${column_name}`);
        if (type) queryParts.push(`internal_type=${type}`);
        queryParts.push("elementISNOTEMPTY");
        queryParts.push("ORDERBYelement");

        const result = await client.query("sys_dictionary", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,element,column_label,internal_type,max_length,mandatory,reference,default_value,read_only,active,choice,comments",
          sysparm_limit: limit ?? 100,
          sysparm_display_value: "true",
        });

        return jsonResult({
          table,
          totalCount: result.totalCount,
          count: result.records.length,
          columns: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_schema_choices",
    "Get choice list values for a field (sys_choice). Returns all available dropdown/choice values for a given table field.",
    {
      table: z.string().describe("Table name, e.g. 'incident'"),
      field: z.string().describe("Field name, e.g. 'state', 'priority', 'category'"),
      inactive: z.boolean().optional().describe("Include inactive choices (default false)"),
    },
    READ,
    async ({ table, field, inactive }) => {
      try {
        const queryParts: string[] = [];
        queryParts.push(`name=${table}`);
        queryParts.push(`element=${field}`);
        if (!inactive) queryParts.push("inactive=false");
        queryParts.push("ORDERBYsequence");

        const result = await client.query("sys_choice", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,element,label,value,sequence,inactive,dependent_value",
          sysparm_limit: 100,
        });

        return jsonResult({
          table,
          field,
          count: result.records.length,
          choices: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_schema_table_hierarchy",
    "Get the full inheritance hierarchy for a table — shows parent chain up to the base table and all direct child tables. Critical for understanding ServiceNow's table-per-hierarchy model.",
    {
      table: z.string().describe("Table name to inspect, e.g. 'incident'"),
    },
    READ,
    async ({ table }) => {
      try {
        // Get the table record itself
        const tableResult = await client.query("sys_db_object", {
          sysparm_query: `name=${table}`,
          sysparm_fields: "sys_id,name,label,super_class,is_extendable,sys_scope",
          sysparm_display_value: "all",
          sysparm_limit: 1,
        });

        if (tableResult.records.length === 0) {
          return jsonResult({ error: `Table '${table}' not found` });
        }

        // Get parent chain
        const parents: Record<string, unknown>[] = [];
        let currentTable = table;
        for (let i = 0; i < 10; i++) {
          const parentResult = await client.query("sys_db_object", {
            sysparm_query: `name=${currentTable}`,
            sysparm_fields: "sys_id,name,label,super_class",
            sysparm_display_value: "all",
            sysparm_limit: 1,
          });
          if (parentResult.records.length === 0) break;
          const rec = parentResult.records[0] as Record<string, unknown>;
          const superClass = rec.super_class as { display_value?: string; value?: string } | undefined;
          if (!superClass?.display_value || superClass.display_value === currentTable) break;
          parents.push({ name: superClass.display_value, label: superClass.value });
          currentTable = superClass.display_value as string;
        }

        // Get direct children
        const childResult = await client.query("sys_db_object", {
          sysparm_query: `super_class.name=${table}^ORDERBYname`,
          sysparm_fields: "sys_id,name,label,is_extendable",
          sysparm_display_value: "true",
          sysparm_limit: 50,
        });

        return jsonResult({
          table: tableResult.records[0],
          parentChain: parents,
          children: childResult.records,
          childCount: childResult.totalCount,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_schema_references",
    "Find all reference fields pointing to or from a table. Helps understand relationships between tables.",
    {
      table: z.string().describe("Table name, e.g. 'incident'"),
      direction: z.enum(["outbound", "inbound", "both"]).optional().describe("Direction of references (default 'both'). 'outbound' = fields on this table referencing others. 'inbound' = fields on other tables referencing this table."),
    },
    READ,
    async ({ table, direction }) => {
      try {
        const dir = direction ?? "both";
        const results: { outbound?: unknown[]; inbound?: unknown[] } = {};

        if (dir === "outbound" || dir === "both") {
          const outbound = await client.query("sys_dictionary", {
            sysparm_query: `name=${table}^internal_type=reference^referenceISNOTEMPTY^ORDERBYelement`,
            sysparm_fields: "sys_id,name,element,column_label,reference",
            sysparm_display_value: "true",
            sysparm_limit: 100,
          });
          results.outbound = outbound.records;
        }

        if (dir === "inbound" || dir === "both") {
          const inbound = await client.query("sys_dictionary", {
            sysparm_query: `internal_type=reference^reference=${table}^ORDERBYname`,
            sysparm_fields: "sys_id,name,element,column_label,reference",
            sysparm_display_value: "true",
            sysparm_limit: 100,
          });
          results.inbound = inbound.records;
        }

        return jsonResult({ table, ...results });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
