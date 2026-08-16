import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerDomainTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_domain_list",
    "List domains (sys_domain) — the domain hierarchy for domain-separated instances",
    {
      parent: z.string().optional().describe("Parent domain sys_id"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ parent, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (parent) qp.push(`parent=${parent}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const result = await client.query("sys_domain", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,parent,active,company,sys_updated_on",
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
    "sn_domain_visibility_user",
    "Check domain visibility grants for a user (sys_user_visibility)",
    {
      user: z.string().describe("User name or sys_id"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ user, limit, offset }) => {
      try {
        const isId = /^[a-f0-9]{32}$/.test(user);
        const query = isId ? `user=${user}` : `user.nameLIKE${user}`;

        const result = await client.query("sys_user_visibility", {
          sysparm_query: `${query}^ORDERBYdomain`,
          sysparm_fields: "sys_id,user,domain,sys_updated_on",
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
    "sn_domain_visibility_group",
    "Check domain visibility grants for a group (sys_user_group_visibility)",
    {
      group: z.string().describe("Group name or sys_id"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ group, limit, offset }) => {
      try {
        const isId = /^[a-f0-9]{32}$/.test(group);
        const query = isId ? `group=${group}` : `group.nameLIKE${group}`;

        const result = await client.query("sys_user_group_visibility", {
          sysparm_query: `${query}^ORDERBYdomain`,
          sysparm_fields: "sys_id,group,domain,sys_updated_on",
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
    "sn_domain_overrides",
    "List domain overrides (sys_overrides) — domain-specific process separation records (business rules, notifications, etc.)",
    {
      domain: z.string().optional().describe("Domain sys_id"),
      overrides_table: z.string().optional().describe("Table being overridden (e.g., sys_script, sysevent_email_action)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ domain, overrides_table, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (domain) qp.push(`sys_domain=${domain}`);
        if (overrides_table) qp.push(`base_table=${overrides_table}`);
        qp.push("ORDERBYbase_table");

        const result = await client.query("sys_overrides", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,base_table,base_record,sys_domain,sys_updated_on",
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
