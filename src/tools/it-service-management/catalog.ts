import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";

export function registerCatalogTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // ========== Catalog Categories ==========

  server.tool(
    "sn_catalog_category_list",
    "List service catalog categories (sc_category). Shows category hierarchy and structure.",
    {
      title: z.string().optional().describe("Filter by title (contains match)"),
      parent: z.string().optional().describe("Filter by parent category sys_id"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ title, parent, active, limit }) => {
      try {
        const queryParts: string[] = [];
        if (title) queryParts.push(`titleLIKE${title}`);
        if (parent) queryParts.push(`parent=${parent}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYtitle");

        const result = await client.query("sc_category", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,title,description,parent,active,sc_catalog,order,sys_updated_on",
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

  // ========== Catalog Items ==========

  server.tool(
    "sn_catalog_item_list",
    "List service catalog items (sc_cat_item). Shows item name, category, price, availability.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      category: z.string().optional().describe("Filter by category sys_id"),
      active: z.boolean().optional().describe("Filter by active status"),
      type: z.enum(["sc_cat_item", "sc_cat_item_producer", "sc_cat_item_guide"]).optional()
        .describe("Item type: standard, record producer, or order guide"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, category, active, type, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (category) queryParts.push(`category=${category}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const tableName = type ?? "sc_cat_item";

        const result = await client.query(tableName, {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,short_description,category,active,price,workflow,delivery_plan,sys_class_name,sys_updated_on",
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
    "sn_catalog_item_get",
    "Get full catalog item details by sys_id, including its variables",
    {
      sys_id: z.string().describe("The sys_id of the catalog item"),
    },
    async ({ sys_id }) => {
      try {
        const [item, variables] = await Promise.all([
          client.getById("sc_cat_item", sys_id),
          client.query("item_option_new", {
            sysparm_query: `cat_item=${sys_id}^ORDERBYorder`,
            sysparm_fields: "sys_id,name,question_text,type,mandatory,default_value,order,active,reference,lookup_table,lookup_label",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          item,
          variables: variables.records,
          variableCount: variables.totalCount,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_catalog_variable_sets",
    "List variable sets (io_set_item) assigned to a catalog item. Variable sets are reusable groups of variables.",
    {
      cat_item_sys_id: z.string().describe("The sys_id of the catalog item"),
    },
    async ({ cat_item_sys_id }) => {
      try {
        // Get variable set assignments
        const assignments = await client.query("io_set_item", {
          sysparm_query: `sc_cat_item=${cat_item_sys_id}^ORDERBYorder`,
          sysparm_fields: "sys_id,variable_set,sc_cat_item,order",
          sysparm_limit: 50,
          sysparm_display_value: "true",
        });

        return jsonResult({
          catItemSysId: cat_item_sys_id,
          count: assignments.records.length,
          variableSets: assignments.records,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Catalog Client Scripts ==========

  server.tool(
    "sn_catalog_client_script_list",
    "List catalog client scripts (catalog_script_client) for a catalog item. These control form behavior in the service portal/catalog.",
    {
      cat_item: z.string().optional().describe("Filter by catalog item sys_id"),
      name: z.string().optional().describe("Filter by name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ cat_item, name, active, limit }) => {
      try {
        const queryParts: string[] = [];
        if (cat_item) queryParts.push(`cat_item=${cat_item}`);
        if (name) queryParts.push(`nameLIKE${name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("catalog_script_client", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,cat_item,type,ui_type,active,applies_to,sys_updated_on",
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
    "sn_catalog_client_script_get",
    "Get full catalog client script details including the script source",
    {
      sys_id: z.string().describe("The sys_id of the catalog client script"),
    },
    async ({ sys_id }) => {
      try {
        const record = await client.getById("catalog_script_client", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Requested Items & Tasks ==========

  server.tool(
    "sn_ritm_list",
    "List requested items (sc_req_item) — catalog requests submitted by users. Useful for debugging catalog fulfillment.",
    {
      cat_item: z.string().optional().describe("Filter by catalog item sys_id"),
      state: z.string().optional().describe("Filter by state"),
      opened_by: z.string().optional().describe("Filter by opened_by user sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ cat_item, state, opened_by, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (cat_item) queryParts.push(`cat_item=${cat_item}`);
        if (state) queryParts.push(`state=${state}`);
        if (opened_by) queryParts.push(`opened_by=${opened_by}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sc_req_item", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,cat_item,state,stage,short_description,opened_by,assigned_to,assignment_group,sys_created_on,sys_updated_on",
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
    "sn_sc_task_list",
    "List catalog tasks (sc_task) — fulfillment tasks for requested items",
    {
      request_item: z.string().optional().describe("Filter by parent requested item sys_id"),
      state: z.string().optional().describe("Filter by state"),
      assignment_group: z.string().optional().describe("Filter by assignment group (name contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ request_item, state, assignment_group, limit }) => {
      try {
        const queryParts: string[] = [];
        if (request_item) queryParts.push(`request_item=${request_item}`);
        if (state) queryParts.push(`state=${state}`);
        if (assignment_group) queryParts.push(`assignment_group.nameLIKE${assignment_group}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sc_task", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,request_item,state,short_description,assigned_to,assignment_group,sys_created_on",
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

  // ========== Ordering (Service Catalog API) ==========
  // Write tools — only in develop mode
  if (mode !== "develop") return;

  server.tool(
    "sn_catalog_order_now",
    "Order a catalog item directly via the Service Catalog API (POST /api/sn_sc/servicecatalog/items/{id}/order_now). Submits the request in one call, bypassing the cart. Returns the generated request (REQ) and requested item (RITM).",
    {
      cat_item_sys_id: z.string().describe("The sys_id of the catalog item (sc_cat_item) to order"),
      quantity: z.coerce.number().min(1).optional().describe("Quantity to order (default 1)"),
      variables: z.record(z.string(), z.unknown()).optional().describe("Variable values keyed by variable name, e.g. { justification: 'new hire', size: 'large' }"),
    },
    async ({ cat_item_sys_id, quantity, variables }) => {
      try {
        const body: Record<string, unknown> = {
          sysparm_quantity: String(quantity ?? 1),
        };
        if (variables) body.variables = variables;
        const result = await client.restApi(
          "POST",
          `/api/sn_sc/servicecatalog/items/${encodeURIComponent(cat_item_sys_id)}/order_now`,
          body
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_catalog_cart_add",
    "Add a catalog item to the current user's cart via the Service Catalog API (POST /api/sn_sc/servicecatalog/items/{id}/add_to_cart). Use with sn_catalog_cart_get and sn_catalog_cart_submit to build a multi-item order.",
    {
      cat_item_sys_id: z.string().describe("The sys_id of the catalog item (sc_cat_item) to add"),
      quantity: z.coerce.number().min(1).optional().describe("Quantity to add (default 1)"),
      variables: z.record(z.string(), z.unknown()).optional().describe("Variable values keyed by variable name"),
    },
    async ({ cat_item_sys_id, quantity, variables }) => {
      try {
        const body: Record<string, unknown> = {
          sysparm_quantity: String(quantity ?? 1),
        };
        if (variables) body.variables = variables;
        const result = await client.restApi(
          "POST",
          `/api/sn_sc/servicecatalog/items/${encodeURIComponent(cat_item_sys_id)}/add_to_cart`,
          body
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_catalog_cart_get",
    "Get the current user's catalog cart contents via the Service Catalog API (GET /api/sn_sc/servicecatalog/cart). Shows items staged for checkout.",
    {},
    async () => {
      try {
        const result = await client.restApi("GET", "/api/sn_sc/servicecatalog/cart");
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_catalog_cart_submit",
    "Submit the current user's cart as an order via the Service Catalog API (POST /api/sn_sc/servicecatalog/cart/submit_order). Creates the request (REQ) from all staged cart items.",
    {},
    async () => {
      try {
        const result = await client.restApi(
          "POST",
          "/api/sn_sc/servicecatalog/cart/submit_order"
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
