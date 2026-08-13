import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerSecurityTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
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
}
