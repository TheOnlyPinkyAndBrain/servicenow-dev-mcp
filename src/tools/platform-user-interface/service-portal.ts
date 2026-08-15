import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerServicePortalTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_portal_list",
    "List Service Portal portals (sp_portal)",
    {
      title: z.string().optional().describe("Portal title (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ title, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (title) qp.push(`titleLIKE${title}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYtitle");

        const result = await client.query("sp_portal", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,title,url_suffix,default_page,theme,css,quick_start_enabled,active,sys_updated_on",
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
    "sn_portal_page_list",
    "List Service Portal pages (sp_page)",
    {
      title: z.string().optional().describe("Page title (contains match)"),
      id: z.string().optional().describe("Page ID (URL path)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ title, id, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (title) qp.push(`titleLIKE${title}`);
        if (id) qp.push(`idLIKE${id}`);
        qp.push("ORDERBYtitle");

        const result = await client.query("sp_page", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,title,id,description,draft,internal,sys_updated_on",
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
    "sn_portal_widget_list",
    "List Service Portal widgets (sp_widget)",
    {
      name: z.string().optional().describe("Widget name (contains match)"),
      id: z.string().optional().describe("Widget ID"),
      category: z.string().optional().describe("Category"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, id, category, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (id) qp.push(`idLIKE${id}`);
        if (category) qp.push(`category=${category}`);
        qp.push("ORDERBYname");

        const result = await client.query("sp_widget", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,id,description,category,data_table,template,client_script,script,css,sys_updated_on",
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
    "sn_portal_widget_get",
    "Get full widget details including HTML template, client script, server script, and CSS",
    {
      sys_id: z.string().describe("Widget sys_id"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [widget, instances] = await Promise.all([
          client.getById("sp_widget", sys_id),
          client.query("sp_instance", {
            sysparm_query: `widget=${sys_id}`,
            sysparm_fields: "sys_id,widget,sp_page,sp_column,order",
            sysparm_display_value: "true",
            sysparm_limit: 20,
          }),
        ]);
        return jsonResult({ widget, instances: instances.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_portal_theme_list",
    "List Service Portal themes",
    {
      name: z.string().optional().describe("Theme name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        qp.push("ORDERBYname");

        const result = await client.query("sp_theme", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,css_variables,navbar_fixed,footer_fixed,sys_updated_on",
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
    "sn_portal_angular_provider_list",
    "List Angular providers (factories, services, directives) used in Service Portal",
    {
      name: z.string().optional().describe("Provider name (contains match)"),
      type: z.string().optional().describe("Provider type (factory, service, directive)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, type, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (type) qp.push(`type=${type}`);
        qp.push("ORDERBYname");

        const result = await client.query("sp_angular_provider", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,type,script,sys_scope,sys_updated_on",
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
