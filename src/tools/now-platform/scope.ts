import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { ACTION, READ } from "../../annotations.js";

// Resolves the authenticated user's own sys_id the same way sn_update_set_set_current
// does, without needing to know which auth method/identity is in play.
async function resolveCurrentUserSysId(client: ServiceNowClient): Promise<string> {
  const me = await client.query("sys_user", {
    sysparm_query: "sys_id=javascript:gs.getUserID()",
    sysparm_fields: "sys_id,user_name",
    sysparm_limit: 1,
  });
  if (me.records.length === 0) {
    throw new Error(
      "Could not resolve the current user via gs.getUserID(). Your instance may block scripted encoded-query values on the Table API for this field/ACL."
    );
  }
  return (me.records[0] as Record<string, unknown>).sys_id as string;
}

// Accepts either a sys_scope sys_id or a scope's technical name (e.g. "sn_hr_agent_ws",
// "global") and resolves the sys_scope record either way.
async function resolveScopeRecord(
  client: ServiceNowClient,
  scope: string
): Promise<Record<string, unknown>> {
  const result = await client.query("sys_scope", {
    sysparm_query: `sys_id=${scope}^ORscope=${scope}`,
    sysparm_fields: "sys_id,name,scope",
    sysparm_limit: 1,
  });
  if (result.records.length === 0) {
    throw new Error(`No application scope found matching sys_id or scope name '${scope}'. Use sn_scope_list to find it.`);
  }
  return result.records[0] as Record<string, unknown>;
}

export function registerScopeTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_scope_list",
    "List application scopes (sys_scope) — all scoped applications and their access modes",
    {
      name: z.string().optional().describe("Scope name (contains match)"),
      scope: z.string().optional().describe("Scope namespace (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, scope, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (scope) qp.push(`scopeLIKE${scope}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const result = await client.query("sys_scope", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,scope,short_description,version,active,private,runtime_access_tracking,sys_updated_on",
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
    "sn_scope_privilege_list",
    "List cross-scope access privilege records (sys_scope_privilege) — shows what cross-scope access has been requested, allowed, or denied",
    {
      source_scope: z.string().optional().describe("Source scope name (contains match) — the app requesting access"),
      target_scope: z.string().optional().describe("Target scope name (contains match) — the app being accessed"),
      status: z.enum(["Allowed", "Requested", "Invalidated"]).optional().describe("Status filter"),
      operation: z.string().optional().describe("Operation (e.g., execute, read, write)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ source_scope, target_scope, status, operation, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (source_scope) qp.push(`source_scope.nameLIKE${source_scope}`);
        if (target_scope) qp.push(`target_scope.nameLIKE${target_scope}`);
        if (status) qp.push(`status=${status}`);
        if (operation) qp.push(`operation=${operation}`);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_scope_privilege", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,source_scope,target_scope,operation,status,type,api_name,sys_updated_on",
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
    "sn_scope_pending_access",
    "List pending cross-scope access requests — requests awaiting admin approval",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ limit, offset }) => {
      try {
        const result = await client.query("sys_scope_privilege", {
          sysparm_query: "statusINRequested,Invalidated^ORDERBYDESCsys_updated_on",
          sysparm_fields: "sys_id,source_scope,target_scope,operation,status,type,api_name,sys_updated_on",
          sysparm_limit: limit ?? 50,
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
    "sn_scope_restricted_caller",
    "List restricted caller access records — controls which scoped apps can call which APIs",
    {
      target_scope: z.string().optional().describe("Target scope name (contains match)"),
      status: z.string().optional().describe("Status filter"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ target_scope, status, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (target_scope) qp.push(`target_scope.nameLIKE${target_scope}`);
        if (status) qp.push(`status=${status}`);
        qp.push("ORDERBYDESCsys_updated_on");

        const result = await client.query("sys_restricted_caller_access", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,caller_access,target_scope,operation,status,sys_updated_on",
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
    "sn_scope_current",
    "Show which application scope new records created by this session's Table API writes will be assigned to. This is the 'apps.current_app' user preference, not a session/token property -- it persists across separate connections for the same authenticated user until changed. Check this before building scoped-app artifacts (tables, script includes, UI actions, dictionary entries, ...): sys_scope is set once at INSERT time from this value and cannot be corrected afterward -- a later PUT/PATCH to a record's sys_scope field is silently ignored by the platform, and a mismatched scope forces custom table/field names into the u_-prefixed global-customization convention (e.g. 'name' becomes 'u_name') even when writing into an otherwise-correctly-scoped table. Use sn_scope_switch to change it first.",
    {},
    READ,
    async () => {
      try {
        const userSysId = await resolveCurrentUserSysId(client);
        const pref = await client.query("sys_user_preference", {
          sysparm_query: `name=apps.current_app^user=${userSysId}`,
          sysparm_fields: "sys_id,value",
          sysparm_limit: 1,
        });

        if (pref.records.length === 0) {
          return jsonResult({
            userSysId,
            currentScope: "global",
            note: "No apps.current_app preference set for this user -- new records default to the global scope. Use sn_scope_switch to target a scoped app instead.",
          });
        }

        const scopeSysId = (pref.records[0] as Record<string, unknown>).value as string;
        const scopeRecord = await resolveScopeRecord(client, scopeSysId).catch(() => null);
        return jsonResult({
          userSysId,
          currentScope: scopeRecord ? (scopeRecord as Record<string, unknown>).scope : scopeSysId,
          scopeSysId,
          scopeRecord,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_scope_switch",
    "Switch this session's current application scope so subsequent Table API writes (new tables, script includes, UI actions, dictionary entries, choices, etc.) are created inside that scoped app instead of global. This sets the 'apps.current_app' user preference for the authenticated user -- the same mechanism the ServiceNow UI's application picker uses -- and persists across separate connections for that user until changed again with this tool. Table API record creation reads this preference at INSERT time; sys_scope cannot be corrected after the fact (updates to it are silently ignored), so call this BEFORE creating scoped-app artifacts, not after. Note this only affects the Table API identity (e.g. OAuth/basic user) -- sn_script_execute's background-script session authenticates separately as SERVICENOW_USERNAME and is not affected by this call.",
    {
      scope: z.string().describe("Either a sys_scope sys_id, or the scope's technical name (e.g. 'sn_hr_agent_ws', or 'global' to switch back)"),
    },
    ACTION,
    async ({ scope }) => {
      try {
        const scopeRecord = await resolveScopeRecord(client, scope);
        const scopeSysId = scopeRecord.sys_id as string;
        const userSysId = await resolveCurrentUserSysId(client);

        const existingPref = await client.query("sys_user_preference", {
          sysparm_query: `name=apps.current_app^user=${userSysId}`,
          sysparm_fields: "sys_id,value",
          sysparm_limit: 1,
        });

        let preference: Record<string, unknown>;
        if (existingPref.records.length > 0) {
          const prefSysId = (existingPref.records[0] as Record<string, unknown>).sys_id as string;
          preference = await client.update("sys_user_preference", prefSysId, { value: scopeSysId });
        } else {
          preference = await client.create("sys_user_preference", {
            name: "apps.current_app",
            user: userSysId,
            value: scopeSysId,
            type: "string",
          });
        }

        return jsonResult({
          message: "Current application scope switched",
          userSysId,
          switchedTo: scopeRecord.scope,
          scopeSysId,
          preference,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
