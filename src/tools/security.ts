import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ELEVATION_FAILED_MARKER, type ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

// ACL writes (sys_security_acl) are the canonical elevated-privilege-gated
// table in ServiceNow — the platform itself refuses these writes without an
// active security_admin elevation, REST or otherwise. There's no REST path
// that can carry a session's elevated flag, so these always go through the
// background-script engine with elevation forced on, rather than the plain
// Table API used by every other create/update tool in this server.
async function runElevatedGlideRecordWrite(
  client: ServiceNowClient,
  script: string
): Promise<{ isError?: true; content: { type: "text"; text: string }[] }> {
  const result = await client.executeBackgroundScript(script, "global", true);

  if (!result.success) {
    return errorResult(new Error(result.error ?? "Script execution failed"));
  }
  if (!result.output || result.output.includes(ELEVATION_FAILED_MARKER)) {
    return errorResult(
      new Error(
        result.output || "ACL write produced no output — the account may lack security_admin."
      )
    );
  }
  try {
    const parsed = JSON.parse(result.output) as { error?: boolean; message?: string };
    if (parsed.error) {
      return errorResult(new Error(parsed.message ?? "ACL write failed"));
    }
    return jsonResult(parsed);
  } catch {
    return errorResult(new Error(result.output));
  }
}

export function registerSecurityTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // ========== Users ==========

  server.tool(
    "sn_user_list",
    "List ServiceNow users (sys_user). Search by name, email, role, or group membership.",
    {
      name: z.string().optional().describe("Filter by name (contains match across first/last name)"),
      email: z.string().optional().describe("Filter by email (contains match)"),
      user_name: z.string().optional().describe("Filter by username (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, email, user_name, active, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (email) queryParts.push(`emailLIKE${email}`);
        if (user_name) queryParts.push(`user_nameLIKE${user_name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_user", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,user_name,name,first_name,last_name,email,active,title,department,location,manager,last_login_time",
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
    "sn_user_roles",
    "List roles assigned to a user (sys_user_has_role). Essential for debugging access/permission issues.",
    {
      user_sys_id: z.string().describe("sys_id of the user"),
      inherited: z.boolean().optional().describe("Include roles inherited from groups (default true)"),
    },
    async ({ user_sys_id, inherited }) => {
      try {
        const queryParts = [`user=${user_sys_id}`];
        if (inherited === false) queryParts.push("inherited=false");
        queryParts.push("ORDERBYrole");

        const result = await client.query("sys_user_has_role", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,user,role,state,inherited,granted_by",
          sysparm_limit: 100,
          sysparm_display_value: "true",
        });

        return jsonResult({
          userSysId: user_sys_id,
          count: result.records.length,
          roles: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_user_groups",
    "List groups a user belongs to (sys_user_grmember). Useful for debugging assignment and access.",
    {
      user_sys_id: z.string().describe("sys_id of the user"),
    },
    async ({ user_sys_id }) => {
      try {
        const result = await client.query("sys_user_grmember", {
          sysparm_query: `user=${user_sys_id}^ORDERBYgroup`,
          sysparm_fields: "sys_id,user,group",
          sysparm_limit: 100,
          sysparm_display_value: "true",
        });

        return jsonResult({
          userSysId: user_sys_id,
          count: result.records.length,
          groups: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Groups ==========

  server.tool(
    "sn_group_list",
    "List ServiceNow groups (sys_user_group). Search by name, type, or manager.",
    {
      name: z.string().optional().describe("Filter by group name (contains match)"),
      type: z.string().optional().describe("Filter by group type"),
      active: z.boolean().optional().describe("Filter by active status"),
      manager: z.string().optional().describe("Filter by manager name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, type, active, manager, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (type) queryParts.push(`type=${type}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (manager) queryParts.push(`manager.nameLIKE${manager}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_user_group", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,description,type,active,manager,email,parent,sys_updated_on",
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
    "sn_group_members",
    "List members of a group (sys_user_grmember)",
    {
      group_sys_id: z.string().describe("sys_id of the group"),
    },
    async ({ group_sys_id }) => {
      try {
        const result = await client.query("sys_user_grmember", {
          sysparm_query: `group=${group_sys_id}^ORDERBYuser`,
          sysparm_fields: "sys_id,user,group",
          sysparm_limit: 100,
          sysparm_display_value: "true",
        });

        return jsonResult({
          groupSysId: group_sys_id,
          count: result.records.length,
          members: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_group_roles",
    "List roles assigned to a group (sys_group_has_role)",
    {
      group_sys_id: z.string().describe("sys_id of the group"),
    },
    async ({ group_sys_id }) => {
      try {
        const result = await client.query("sys_group_has_role", {
          sysparm_query: `group=${group_sys_id}^ORDERBYrole`,
          sysparm_fields: "sys_id,group,role,inherits",
          sysparm_limit: 100,
          sysparm_display_value: "true",
        });

        return jsonResult({
          groupSysId: group_sys_id,
          count: result.records.length,
          roles: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Roles ==========

  server.tool(
    "sn_role_list",
    "List roles (sys_user_role). Shows role name, description, and elevated privilege status.",
    {
      name: z.string().optional().describe("Filter by role name (contains match)"),
      elevated_privilege: z.boolean().optional().describe("Filter by elevated privilege flag"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, elevated_privilege, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (elevated_privilege !== undefined) queryParts.push(`elevated_privilege=${elevated_privilege}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_user_role", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,description,elevated_privilege,sys_scope,assignable_by,sys_updated_on",
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
    "sn_role_contains",
    "List roles contained within a role (sys_user_role_contains). Shows role inheritance hierarchy.",
    {
      role_sys_id: z.string().describe("sys_id of the parent role"),
    },
    async ({ role_sys_id }) => {
      try {
        const result = await client.query("sys_user_role_contains", {
          sysparm_query: `role=${role_sys_id}^ORDERBYcontains`,
          sysparm_fields: "sys_id,role,contains",
          sysparm_limit: 100,
          sysparm_display_value: "true",
        });

        return jsonResult({
          roleSysId: role_sys_id,
          count: result.records.length,
          containedRoles: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Access Control (ACLs) ==========

  server.tool(
    "sn_acl_list",
    "List Access Controls (sys_security_acl). Shows the table/field an ACL guards, its operation (read/write/create/delete), and type.",
    {
      table: z.string().optional().describe("Filter by the table name the ACL applies to (contains match on 'name')"),
      operation: z.enum(["read", "write", "create", "delete"]).optional().describe("Filter by operation"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ table, operation, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (table) queryParts.push(`nameLIKE${table}`);
        if (operation) queryParts.push(`operation=${operation}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_security_acl", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,operation,type,active,admin_overrides,script,condition,sys_updated_on",
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
    "sn_acl_get",
    "Get full Access Control details by sys_id, including the ACL script and condition",
    {
      sys_id: z.string().describe("The sys_id of the ACL"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_security_acl", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  // sn_acl_create — Develop only. Always self-elevates to security_admin;
  // ACL writes are refused by the platform without it, REST or otherwise.
  server.tool(
    "sn_acl_create",
    "Create a new Access Control (sys_security_acl). Automatically self-elevates to security_admin for this write via the background-script engine (see the Role Elevation section in the README) — this only works if the SERVICENOW_USERNAME account already holds security_admin directly; it cannot grant the role.",
    {
      data: z
        .record(z.unknown())
        .describe(
          "Field-value pairs for the new ACL (typically 'name' (table or table.field), 'operation' " +
          "(read/write/create/delete), 'type' (record/field), 'active', 'admin_overrides', 'script', 'condition', 'roles')"
        ),
    },
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

  // sn_acl_update — Develop only. Always self-elevates to security_admin.
  server.tool(
    "sn_acl_update",
    "Update an existing Access Control (sys_security_acl). Automatically self-elevates to security_admin for this write via the background-script engine — this only works if the SERVICENOW_USERNAME account already holds security_admin directly; it cannot grant the role.",
    {
      sys_id: z.string().describe("The sys_id of the ACL to update"),
      data: z.record(z.unknown()).describe("Field-value pairs to update"),
    },
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
