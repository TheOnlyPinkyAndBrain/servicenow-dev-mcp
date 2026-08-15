import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";

export function registerUiTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // ========== UI Pages (Jelly pages) ==========

  server.tool(
    "sn_ui_page_list",
    "List UI Pages (sys_ui_page) — Jelly-based pages used across the platform. Includes processor pages and custom pages.",
    {
      name: z.string().optional().describe("Filter by page name (contains match)"),
      category: z.string().optional().describe("Filter by category"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, category, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (category) queryParts.push(`category=${category}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_ui_page", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,description,category,direct,sys_scope,sys_updated_on",
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
    "sn_ui_page_get",
    "Get full UI Page details including HTML, client script, and processing script",
    {
      sys_id: z.string().describe("The sys_id of the UI Page"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_ui_page", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== UI Macros ==========

  server.tool(
    "sn_ui_macro_list",
    "List UI Macros (sys_ui_macro) — reusable Jelly template components",
    {
      name: z.string().optional().describe("Filter by macro name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ name, limit }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_ui_macro", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,description,active,scoped,sys_scope,sys_updated_on",
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

  // ========== UI Scripts ==========

  server.tool(
    "sn_ui_script_list",
    "List UI Scripts (sys_ui_script) — global client-side JavaScript libraries loaded on pages",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      global: z.boolean().optional().describe("Filter by global flag"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ name, active, global: isGlobal, limit }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (isGlobal !== undefined) queryParts.push(`global=${isGlobal}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_ui_script", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,description,active,global,ui_type,sys_scope,sys_updated_on",
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
    "sn_ui_script_get",
    "Get full UI Script details including source code",
    {
      sys_id: z.string().describe("The sys_id of the UI Script"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sys_ui_script", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Form Sections & Related Lists ==========

  server.tool(
    "sn_form_sections",
    "List form sections (sys_ui_section) for a table. Shows the layout structure of a form.",
    {
      table: z.string().describe("Table name, e.g. 'incident'"),
      view: z.string().optional().describe("Filter by view name (default view if not specified)"),
    },
    async ({ table, view }) => {
      try {
        const queryParts: string[] = [`name=${table}`];
        if (view) queryParts.push(`view.name=${view}`);
        queryParts.push("ORDERBYposition");

        const result = await client.query("sys_ui_section", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,caption,position,view,sys_updated_on",
          sysparm_limit: 50,
          sysparm_display_value: "true",
        });

        return jsonResult({
          table,
          count: result.records.length,
          sections: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_form_layout",
    "Get the form layout (sys_ui_element) for a table — shows which fields appear on the form and their positions. Critical for understanding form customization.",
    {
      table: z.string().describe("Table name, e.g. 'incident'"),
      view: z.string().optional().describe("View name (default view if not specified)"),
    },
    async ({ table, view }) => {
      try {
        const queryParts: string[] = [`name=${table}`];
        if (view) queryParts.push(`sys_ui_section.view.name=${view}`);
        queryParts.push("ORDERBYposition");

        const result = await client.query("sys_ui_element", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,element,type,position,sys_ui_section",
          sysparm_limit: 200,
          sysparm_display_value: "true",
        });

        return jsonResult({
          table,
          count: result.records.length,
          elements: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_related_lists",
    "List related lists configured for a table (sys_ui_related_list_entry). Shows which related lists appear on a form.",
    {
      table: z.string().describe("Table name, e.g. 'incident'"),
      view: z.string().optional().describe("View name"),
    },
    async ({ table, view }) => {
      try {
        const queryParts: string[] = [`list_id=${table}`];
        if (view) queryParts.push(`view.name=${view}`);
        queryParts.push("ORDERBYposition");

        const result = await client.query("sys_ui_related_list_entry", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,list_id,related_list,position,view",
          sysparm_limit: 50,
          sysparm_display_value: "true",
        });

        return jsonResult({
          table,
          count: result.records.length,
          relatedLists: result.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Service Portal ==========

  server.tool(
    "sn_sp_portal_list",
    "List Service Portals (sp_portal). Shows portal configuration and settings.",
    {
      title: z.string().optional().describe("Filter by portal title (contains match)"),
      limit: z.coerce.number().min(1).max(50).optional().describe("Max records (default 20)"),
    },
    async ({ title, limit }) => {
      try {
        const queryParts: string[] = [];
        if (title) queryParts.push(`titleLIKE${title}`);
        queryParts.push("ORDERBYtitle");

        const result = await client.query("sp_portal", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,title,url_suffix,css,quick_start_enabled,theme,logo,sys_updated_on",
          sysparm_limit: limit,
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
    "sn_sp_widget_list",
    "List Service Portal widgets (sp_widget). Widgets are the building blocks of Service Portal pages.",
    {
      name: z.string().optional().describe("Filter by widget name (contains match)"),
      id: z.string().optional().describe("Filter by widget ID (exact match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, id, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (id) queryParts.push(`id=${id}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sp_widget", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,id,template,css,data_table,sys_scope,sys_updated_on",
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
    "sn_sp_widget_get",
    "Get full Service Portal widget details including HTML template, CSS, client script, server script, and link function",
    {
      sys_id: z.string().describe("The sys_id of the widget"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("sp_widget", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_sp_page_list",
    "List Service Portal pages (sp_page)",
    {
      title: z.string().optional().describe("Filter by page title (contains match)"),
      id: z.string().optional().describe("Filter by page ID (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ title, id, limit }) => {
      try {
        const queryParts: string[] = [];
        if (title) queryParts.push(`titleLIKE${title}`);
        if (id) queryParts.push(`idLIKE${id}`);
        queryParts.push("ORDERBYtitle");

        const result = await client.query("sp_page", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,title,id,description,internal,draft,sys_updated_on",
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

  // ========== Angular Providers (Service Portal) ==========

  server.tool(
    "sn_sp_angular_provider_list",
    "List Service Portal Angular providers (sp_angular_provider) — services, factories, directives, and filters used in widgets",
    {
      name: z.string().optional().describe("Filter by provider name (contains match)"),
      type: z.enum(["service", "factory", "directive", "filter"]).optional().describe("Filter by provider type"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ name, type, limit }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (type) queryParts.push(`type=${type}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sp_angular_provider", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,type,sys_scope,sys_updated_on",
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
}
