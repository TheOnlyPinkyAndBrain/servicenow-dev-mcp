import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult, runUnelevatedGlideRecordWrite } from "../../utils.js";
import { CREATE, READ, UPDATE, DELETE } from "../../annotations.js";

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
    READ,
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
    READ,
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
    READ,
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
    READ,
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
    READ,
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
    READ,
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
    READ,
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
    READ,
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

  // ========== Catalog UI Policy Actions ==========
  // catalog_ui_policy_action extends sys_ui_policy_action (verified via
  // schema table hierarchy), inheriting the 'ui_policy' field and the same
  // deny ACLs (create + write) that block setting it via the plain Table
  // API on this instance -- confirmed empirically, same as sys_ui_policy_action.

  // sn_catalog_ui_policy_action_get — Both modes
  server.tool(
    "sn_catalog_ui_policy_action_get",
    "Get a single Catalog UI Policy Action by sys_id",
    {
      sys_id: z.string().describe("The sys_id of the Catalog UI Policy Action"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const record = await client.getById("catalog_ui_policy_action", sys_id);
        return jsonResult(record);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Requests (REQ header) ==========

  server.tool(
    "sn_request_list",
    "List service catalog requests (sc_request) — the REQ header record that groups one or more requested items (RITMs). Use sn_ritm_list for the line items and sn_sc_task_list for fulfillment tasks.",
    {
      requested_for: z.string().optional().describe("Filter by requested_for user sys_id"),
      opened_by: z.string().optional().describe("Filter by opened_by user sys_id"),
      state: z.string().optional().describe("Filter by request state"),
      approval: z.string().optional().describe("Filter by approval state (e.g. 'requested', 'approved', 'rejected')"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ requested_for, opened_by, state, approval, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (requested_for) queryParts.push(`requested_for=${requested_for}`);
        if (opened_by) queryParts.push(`opened_by=${opened_by}`);
        if (state) queryParts.push(`request_state=${state}`);
        if (approval) queryParts.push(`approval=${approval}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");
        const result = await client.query("sc_request", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,requested_for,opened_by,request_state,approval,stage,price,sys_created_on,sys_updated_on",
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
    "sn_request_get",
    "Get a service catalog request (sc_request) by sys_id, together with its requested items (sc_req_item).",
    {
      sys_id: z.string().describe("The sys_id of the request (sc_request)"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [request, items] = await Promise.all([
          client.getById("sc_request", sys_id),
          client.query("sc_req_item", {
            sysparm_query: `request=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,cat_item,state,stage,short_description,assigned_to,assignment_group,price",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
        ]);
        return jsonResult({ request, requestedItems: items.records, requestedItemCount: items.totalCount });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // Write tools below — only in develop mode
  if (mode !== "develop") return;

  // ========== Ordering (Service Catalog API) ==========

  server.tool(
    "sn_catalog_order_now",
    "Order a catalog item directly via the Service Catalog API (POST /api/sn_sc/servicecatalog/items/{id}/order_now). Submits the request in one call, bypassing the cart. Returns the generated request (REQ) and requested item (RITM).",
    {
      cat_item_sys_id: z.string().describe("The sys_id of the catalog item (sc_cat_item) to order"),
      quantity: z.coerce.number().min(1).optional().describe("Quantity to order (default 1)"),
      variables: z.record(z.string(), z.unknown()).optional().describe("Variable values keyed by variable name, e.g. { justification: 'new hire', size: 'large' }"),
    },
    CREATE,
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
    CREATE,
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
    READ,
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
    CREATE,
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

  // ========== Catalog admin writes ==========

  server.tool(
    "sn_catalog_category_create",
    "Create a new service catalog category (sc_category).",
    {
      title: z.string().describe("Category title"),
      description: z.string().optional().describe("Description"),
      parent: z.string().optional().describe("Parent category sys_id"),
      sc_catalog: z.string().optional().describe("Catalog sys_id this category belongs to"),
      active: z.boolean().optional().describe("Active status (default true)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ title, description, parent, sc_catalog, active, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { title, ...additional_fields };
        if (description) body.description = description;
        if (parent) body.parent = parent;
        if (sc_catalog) body.sc_catalog = sc_catalog;
        if (active !== undefined) body.active = active;

        const result = await client.create("sc_category", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_catalog_category_update",
    "Update a service catalog category (sc_category), including moving it under a different parent.",
    {
      sys_id: z.string().describe("sys_id of the category to update"),
      title: z.string().optional().describe("Category title"),
      description: z.string().optional().describe("Description"),
      parent: z.string().optional().describe("Parent category sys_id"),
      active: z.boolean().optional().describe("Active status"),
      order: z.coerce.number().optional().describe("Display order"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, title, description, parent, active, order, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (title) body.title = title;
        if (description) body.description = description;
        if (parent) body.parent = parent;
        if (active !== undefined) body.active = active;
        if (order !== undefined) body.order = order;

        const result = await client.update("sc_category", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_catalog_item_update",
    "Update a service catalog item (sc_cat_item), including moving it to a different category. To move several items at once, call this once per item sys_id.",
    {
      sys_id: z.string().describe("sys_id of the catalog item to update"),
      name: z.string().optional().describe("Item name"),
      short_description: z.string().optional().describe("Short description"),
      category: z.string().optional().describe("Category sys_id to move the item into"),
      active: z.boolean().optional().describe("Active status"),
      price: z.string().optional().describe("Price"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, name, short_description, category, active, price, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (name) body.name = name;
        if (short_description) body.short_description = short_description;
        if (category) body.category = category;
        if (active !== undefined) body.active = active;
        if (price) body.price = price;

        const result = await client.update("sc_cat_item", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_catalog_item_variable_create",
    "Create a new variable (item_option_new) on a catalog item — a question shown on the item's order form.",
    {
      cat_item: z.string().describe("sys_id of the catalog item (sc_cat_item) this variable belongs to"),
      name: z.string().describe("Internal variable name"),
      question_text: z.string().describe("Question text shown to the user"),
      type: z.string().describe("Variable type code (e.g. '6' = single line text, '5' = multi-line, '8' = select box, '1' = yes/no)"),
      mandatory: z.boolean().optional().describe("Whether the variable is required"),
      default_value: z.string().optional().describe("Default value"),
      order: z.coerce.number().optional().describe("Display order"),
      active: z.boolean().optional().describe("Active status (default true)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ cat_item, name, question_text, type, mandatory, default_value, order, active, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { cat_item, name, question_text, type, ...additional_fields };
        if (mandatory !== undefined) body.mandatory = mandatory;
        if (default_value) body.default_value = default_value;
        if (order !== undefined) body.order = order;
        if (active !== undefined) body.active = active;

        const result = await client.create("item_option_new", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_catalog_item_variable_update",
    "Update a catalog item variable (item_option_new).",
    {
      sys_id: z.string().describe("sys_id of the variable to update"),
      question_text: z.string().optional().describe("Question text shown to the user"),
      type: z.string().optional().describe("Variable type code"),
      mandatory: z.boolean().optional().describe("Whether the variable is required"),
      default_value: z.string().optional().describe("Default value"),
      order: z.coerce.number().optional().describe("Display order"),
      active: z.boolean().optional().describe("Active status"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    UPDATE,
    async ({ sys_id, question_text, type, mandatory, default_value, order, active, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { ...additional_fields };
        if (question_text) body.question_text = question_text;
        if (type) body.type = type;
        if (mandatory !== undefined) body.mandatory = mandatory;
        if (default_value) body.default_value = default_value;
        if (order !== undefined) body.order = order;
        if (active !== undefined) body.active = active;

        const result = await client.update("item_option_new", sys_id, body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Catalog UI Policy Actions (develop only) ==========

  // sn_catalog_ui_policy_action_create — Develop only. Routes through the
  // background-script engine (GlideRecord), same reason and same no-elevation
  // approach as sn_ui_policy_action_create.
  server.tool(
    "sn_catalog_ui_policy_action_create",
    "Create a new Catalog UI Policy Action (catalog_ui_policy_action) and link it to its parent Catalog UI Policy. Routes through the background-script engine rather than the plain Table API, because this instance's 'ui_policy' field isn't settable via a direct REST write (same as sn_ui_policy_action_create).",
    {
      data: z
        .record(z.string(), z.unknown())
        .describe(
          "Field-value pairs for the new Catalog UI Policy Action. Must include 'ui_policy' (sys_id of the " +
          "parent Catalog UI Policy). Common fields: 'catalog_variable' (variable name), 'visible', 'mandatory', " +
          "'disabled' (booleans)."
        ),
    },
    CREATE,
    async ({ data }) => {
      const script = [
        `var data = ${JSON.stringify(data)};`,
        "var gr = new GlideRecord('catalog_ui_policy_action');",
        "gr.initialize();",
        "for (var key in data) { gr.setValue(key, data[key]); }",
        "var sysId = gr.insert();",
        "if (!sysId) {",
        "  gs.print(JSON.stringify({ error: true, message: 'Catalog UI Policy Action insert failed', lastError: gr.getLastErrorMessage ? gr.getLastErrorMessage() : null }));",
        "} else {",
        "  var out = { sys_id: sysId };",
        "  for (var k in data) { out[k] = gr.getValue(k); }",
        "  gs.print(JSON.stringify(out));",
        "}",
      ].join("\n");

      return runUnelevatedGlideRecordWrite(client, script);
    }
  );

  // sn_catalog_ui_policy_action_update — Develop only. Same background-script
  // route as create, for the same reason.
  server.tool(
    "sn_catalog_ui_policy_action_update",
    "Update an existing Catalog UI Policy Action (catalog_ui_policy_action), including reassigning it via 'ui_policy'. Routes through the background-script engine for the same reason as sn_catalog_ui_policy_action_create.",
    {
      sys_id: z.string().describe("The sys_id of the Catalog UI Policy Action to update"),
      data: z
        .record(z.string(), z.unknown())
        .describe("Field-value pairs to update, e.g. 'ui_policy', 'catalog_variable', 'visible', 'mandatory', 'disabled'"),
    },
    UPDATE,
    async ({ sys_id, data }) => {
      const script = [
        `var sysId = ${JSON.stringify(sys_id)};`,
        `var data = ${JSON.stringify(data)};`,
        "var gr = new GlideRecord('catalog_ui_policy_action');",
        "if (!gr.get(sysId)) {",
        "  gs.print(JSON.stringify({ error: true, message: 'Catalog UI Policy Action not found: ' + sysId }));",
        "} else {",
        "  for (var key in data) { gr.setValue(key, data[key]); }",
        "  gr.update();",
        "  var out = { sys_id: sysId };",
        "  for (var k in data) { out[k] = gr.getValue(k); }",
        "  gs.print(JSON.stringify(out));",
        "}",
      ].join("\n");

      return runUnelevatedGlideRecordWrite(client, script);
    }
  );

  // sn_catalog_ui_policy_action_delete — Develop only. Plain Table API, like
  // sn_ui_policy_action_delete -- the deny ACLs on 'ui_policy' don't cover delete.
  server.tool(
    "sn_catalog_ui_policy_action_delete",
    "Delete a Catalog UI Policy Action (catalog_ui_policy_action) by sys_id",
    {
      sys_id: z.string().describe("The sys_id of the Catalog UI Policy Action to delete"),
    },
    DELETE,
    async ({ sys_id }) => {
      try {
        await client.delete("catalog_ui_policy_action", sys_id);
        return { content: [{ type: "text" as const, text: `Catalog UI Policy Action ${sys_id} deleted.` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
