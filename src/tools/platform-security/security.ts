import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, DELETE, READ, UPDATE } from "../../annotations.js";

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
    READ,
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
    READ,
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
    READ,
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
    READ,
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
    READ,
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
    READ,
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
    READ,
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
    READ,
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

  server.tool(
    "sn_user_criteria_list",
    "List user criteria (user_criteria) — reusable access-control definitions (by role/group/user/company/dept/location) used to gate catalog items and knowledge.",
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
        const result = await client.query("user_criteria", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,active,role,group,user,match_all,short_description,sys_updated_on",
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
    "sn_oauth_entity_list",
    "List OAuth application registries (oauth_entity) — OAuth clients/providers configured on the instance. Secrets are not returned.",
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
        const result = await client.query("oauth_entity", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,client_id,client_type,type,active,default_grant_type,redirect_url,sys_updated_on",
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
    "sn_ldap_server_list",
    "List LDAP server configurations (ldap_server_config) — directory servers used for import/authentication. Credentials are not returned.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");
        const result = await client.query("ldap_server_config", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,active,server_url,ssl,mid_server,vendor,sys_updated_on",
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

  // ========== User writes ==========

  server.tool(
    "sn_user_create",
    "Create a new user (sys_user).",
    {
      user_name: z.string().describe("Login username"),
      first_name: z.string().optional().describe("First name"),
      last_name: z.string().optional().describe("Last name"),
      email: z.string().optional().describe("Email address"),
      active: z.boolean().optional().describe("Active status (default true)"),
      department: z.string().optional().describe("Department sys_id"),
      manager: z.string().optional().describe("Manager's user sys_id"),
      title: z.string().optional().describe("Job title"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ user_name, first_name, last_name, email, active, department, manager, title, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { user_name, ...additional_fields };
        if (first_name) body.first_name = first_name;
        if (last_name) body.last_name = last_name;
        if (email) body.email = email;
        if (active !== undefined) body.active = active;
        if (department) body.department = department;
        if (manager) body.manager = manager;
        if (title) body.title = title;

        const result = await client.create("sys_user", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_user_update",
    "Update an existing user (sys_user).",
    {
      sys_id: z.string().describe("sys_id of the user to update"),
      first_name: z.string().optional().describe("First name"),
      last_name: z.string().optional().describe("Last name"),
      email: z.string().optional().describe("Email address"),
      active: z.boolean().optional().describe("Active status"),
      department: z.string().optional().describe("Department sys_id"),
      manager: z.string().optional().describe("Manager's user sys_id"),
      title: z.string().optional().describe("Job title"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, first_name, last_name, email, active, department, manager, title, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (first_name) body.first_name = first_name;
        if (last_name) body.last_name = last_name;
        if (email) body.email = email;
        if (active !== undefined) body.active = active;
        if (department) body.department = department;
        if (manager) body.manager = manager;
        if (title) body.title = title;

        const result = await client.update("sys_user", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Group writes ==========

  server.tool(
    "sn_group_create",
    "Create a new group (sys_user_group).",
    {
      name: z.string().describe("Group name"),
      description: z.string().optional().describe("Description"),
      type: z.string().optional().describe("Group type"),
      active: z.boolean().optional().describe("Active status (default true)"),
      manager: z.string().optional().describe("Manager's user sys_id"),
      email: z.string().optional().describe("Group email"),
      parent: z.string().optional().describe("Parent group sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ name, description, type, active, manager, email, parent, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { name, ...additional_fields };
        if (description) body.description = description;
        if (type) body.type = type;
        if (active !== undefined) body.active = active;
        if (manager) body.manager = manager;
        if (email) body.email = email;
        if (parent) body.parent = parent;

        const result = await client.create("sys_user_group", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_group_update",
    "Update an existing group (sys_user_group).",
    {
      sys_id: z.string().describe("sys_id of the group to update"),
      name: z.string().optional().describe("Group name"),
      description: z.string().optional().describe("Description"),
      type: z.string().optional().describe("Group type"),
      active: z.boolean().optional().describe("Active status"),
      manager: z.string().optional().describe("Manager's user sys_id"),
      email: z.string().optional().describe("Group email"),
      parent: z.string().optional().describe("Parent group sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, name, description, type, active, manager, email, parent, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (name) body.name = name;
        if (description) body.description = description;
        if (type) body.type = type;
        if (active !== undefined) body.active = active;
        if (manager) body.manager = manager;
        if (email) body.email = email;
        if (parent) body.parent = parent;

        const result = await client.update("sys_user_group", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_group_member_add",
    "Add a user to a group (sys_user_grmember).",
    {
      group_sys_id: z.string().describe("sys_id of the group"),
      user_sys_id: z.string().describe("sys_id of the user to add"),
    },
    CREATE,
    async ({ group_sys_id, user_sys_id }) => {
      try {
        const result = await client.create("sys_user_grmember", { group: group_sys_id, user: user_sys_id });
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_group_member_remove",
    "Remove a user from a group by deleting their membership record (sys_user_grmember). Look up the membership sys_id via sn_group_members first.",
    {
      membership_sys_id: z.string().describe("sys_id of the sys_user_grmember record to delete (from sn_group_members)"),
    },
    DELETE,
    async ({ membership_sys_id }) => {
      try {
        await client.delete("sys_user_grmember", membership_sys_id);
        return jsonResult({ success: true, message: "Group membership removed" });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
