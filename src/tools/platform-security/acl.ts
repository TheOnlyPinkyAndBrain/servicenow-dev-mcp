import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult, runElevatedGlideRecordWrite } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

export function registerAclTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_acl_list",
    "List ACLs (sys_security_acl), optionally filtered by table, operation, or type",
    {
      table: z.string().optional().describe("Filter ACLs by name (contains match, often the table)"),
      operation: z
        .enum([
          "read",
          "write",
          "create",
          "delete",
          "execute",
          "query_match",
          "query_range",
          "report_view",
          "list_edit",
          "add_to_list",
          "personalize_choices",
          "conditional_table_query_range",
          "edit_task_relations",
          "edit_ci_relations",
          "save_as_template",
          "data_fabric",
          "report_on",
          "invoke_from_ai",
        ])
        .optional()
        .describe("Filter by operation type (sys_security_operation)"),
      type: z.string().optional().describe("Filter by ACL type (e.g. 'record')"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ table, operation, type, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`nameLIKE${table}`);
        if (operation) queryParts.push(`operation=${operation}`);
        if (type) queryParts.push(`type=${type}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");
        const result = await client.query("sys_security_acl", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,operation,type,active,condition,script,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_acl_get",
    "Get full ACL details by sys_id, including script and condition",
    {
      sys_id: z.string().describe("The sys_id of the ACL"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_security_acl", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_acl_roles",
    "List the roles required by an ACL (sys_security_acl_role) — the role-to-ACL mappings that determine which roles satisfy an access control. Useful for debugging why a user can/can't access a record.",
    {
      acl_sys_id: z.string().describe("The sys_id of the ACL (sys_security_acl)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    READ,
    async ({ acl_sys_id, limit }) => {
      try {
        const result = await client.query("sys_security_acl_role", {
          sysparm_query: `sys_security_acl=${acl_sys_id}`,
          sysparm_fields: "sys_id,sys_security_acl,sys_user_role",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ aclSysId: acl_sys_id, count: result.records.length, roles: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_security_attribute_list",
    "List Security Attributes (sys_security_attribute) — reusable named conditions that ACLs can reference via their security_attribute field instead of inlining a condition/script",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      type: z.string().optional().describe("Filter by attribute type (e.g. 'boolean', 'compound')"),
      is_system: z.boolean().optional().describe("Filter by system-defined status"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, type, is_system, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (type) queryParts.push(`type=${type}`);
        if (is_system !== undefined) queryParts.push(`is_system=${is_system}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");
        const result = await client.query("sys_security_attribute", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,name,label,type,description,condition,script,is_dynamic,is_localized,is_system,active,lookup_table,lookup_table_column,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_security_attribute_get",
    "Get full Security Attribute details by sys_id, including condition and script",
    {
      sys_id: z.string().describe("The sys_id of the security attribute"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_security_attribute", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_security_attribute_audit_list",
    "List Security Attribute audit records (v_security_attribute_audit) — tracks where/which records reference a security attribute, most recent first",
    {
      attribute_sys_id: z.string().optional().describe("Filter by the sys_id of the security attribute (sys_security_attribute)"),
      table_name: z.string().optional().describe("Filter by table name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ attribute_sys_id, table_name, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (attribute_sys_id) queryParts.push(`security_attribute=${attribute_sys_id}`);
        if (table_name) queryParts.push(`table_nameLIKE${table_name}`);
        queryParts.push("ORDERBYDESCsys_updated_on");
        const result = await client.query("v_security_attribute_audit", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields:
            "sys_id,security_attribute,referenced_by,table_name,scope,sys_created_by,sys_created_on,sys_updated_by,sys_updated_on,sys_mod_count",
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

  // sn_acl_create — Always self-elevates to security_admin; the platform
  // refuses ACL writes without it, REST or otherwise, so this routes through
  // the background-script engine instead of the plain Table API.
  server.tool(
    "sn_acl_create",
    "Create a new Access Control (sys_security_acl). Automatically self-elevates to security_admin for this write (see the Role Elevation section in the README) — this only works if the SERVICENOW_USERNAME account already holds security_admin directly; it cannot grant the role.",
    {
      data: z
        .record(z.string(), z.unknown())
        .describe(
          "Field-value pairs for the new ACL (typically 'name' (table or table.field), 'operation' " +
          "(read/write/create/delete), 'type' (record/field), 'active', 'admin_overrides', 'script', 'condition', 'roles')"
        ),
    },
    CREATE,
    async ({ data }) => {
      const script = [
        `var data = ${JSON.stringify(data)};`,
        "var gr = new GlideRecord('sys_security_acl');",
        "gr.initialize();",
        "for (var key in data) { gr.setValue(key, data[key]); }",
        "var sysId = gr.insert();",
        "if (!sysId) {",
        "  gs.print(JSON.stringify({ error: true, message: 'ACL insert failed', lastError: gr.getLastErrorMessage ? gr.getLastErrorMessage() : null }));",
        "} else {",
        "  var out = { sys_id: sysId };",
        "  for (var k in data) { out[k] = gr.getValue(k); }",
        "  gs.print(JSON.stringify(out));",
        "}",
      ].join("\n");

      return runElevatedGlideRecordWrite(client, script);
    }
  );

  // sn_acl_update — Always self-elevates to security_admin.
  server.tool(
    "sn_acl_update",
    "Update an existing Access Control (sys_security_acl). Automatically self-elevates to security_admin for this write — this only works if the SERVICENOW_USERNAME account already holds security_admin directly; it cannot grant the role.",
    {
      sys_id: z.string().describe("The sys_id of the ACL to update"),
      data: z.record(z.string(), z.unknown()).describe("Field-value pairs to update"),
    },
    UPDATE,
    async ({ sys_id, data }) => {
      const script = [
        `var sysId = ${JSON.stringify(sys_id)};`,
        `var data = ${JSON.stringify(data)};`,
        "var gr = new GlideRecord('sys_security_acl');",
        "if (!gr.get(sysId)) {",
        "  gs.print(JSON.stringify({ error: true, message: 'ACL not found: ' + sysId }));",
        "} else {",
        "  for (var key in data) { gr.setValue(key, data[key]); }",
        "  gr.update();",
        "  var out = { sys_id: sysId };",
        "  for (var k in data) { out[k] = gr.getValue(k); }",
        "  gs.print(JSON.stringify(out));",
        "}",
      ].join("\n");

      return runElevatedGlideRecordWrite(client, script);
    }
  );
}
