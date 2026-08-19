import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Read-only by design: UI Builder experiences/pages are visually authored
// (component trees, data resources, client-state) the same way Service
// Portal widgets are -- scripting a create/update against these tables
// would produce a record with none of the actual page content, so this
// module sticks to discovery/inspection, matching this server's stance on
// other GUI-authored artifacts (e.g. sn_workflow_create's activity caveat).
export function registerUiBuilderTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_ux_experience_list",
    "List UI Builder experiences/workspaces (sys_ux_experience) — the modern successor to Service Portal for building custom UIs (used heavily for CSM/HRSD workspaces and Employee Center).",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const result = await client.query("sys_ux_experience", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,root_route,active,sys_scope,sys_updated_on",
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
    "sn_ux_page_list",
    "List UI Builder pages (sys_ux_page) — the individual pages/routes that make up an experience.",
    {
      experience: z.string().optional().describe("Filter by parent experience sys_id"),
      name: z.string().optional().describe("Filter by name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ experience, name, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (experience) qp.push(`sys_ux_experience=${experience}`);
        if (name) qp.push(`nameLIKE${name}`);
        qp.push("ORDERBYname");

        const result = await client.query("sys_ux_page", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,sys_ux_experience,sys_scope,sys_updated_on",
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
    "sn_ux_page_registry_list",
    "List UX page registry entries (sys_ux_page_registry) — the routes/URLs that expose a UI Builder page or macroponent for navigation.",
    {
      page: z.string().optional().describe("Filter by page sys_id"),
      route: z.string().optional().describe("Filter by route (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ page, route, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (page) qp.push(`page=${page}`);
        if (route) qp.push(`routeLIKE${route}`);
        qp.push("ORDERBYroute");

        const result = await client.query("sys_ux_page_registry", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,route,page,application,active,sys_scope,sys_updated_on",
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
