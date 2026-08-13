import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerProcurementTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // ========== Vendors (core_company with vendor=true) ==========

  server.tool(
    "sn_vendor_list",
    "List vendors (core_company where vendor=true). Platform-level vendor records. For S2P suppliers with richer financial data use sn_s2p_supplier_list instead.",
    {
      name: z.string().optional().describe("Filter by vendor name (contains match)"),
      vendor_type: z.string().optional().describe("Filter by vendor type name (contains match)"),
      country: z.string().optional().describe("Filter by country"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, vendor_type, country, limit, offset }) => {
      try {
        const queryParts: string[] = ["vendor=true"];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (vendor_type) queryParts.push(`vendor_typeLIKE${vendor_type}`);
        if (country) queryParts.push(`country=${country}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("core_company", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,vendor_type,vendor_manager,contact,phone,city,state,country,website,discount,notes,sys_updated_on",
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
    "sn_vendor_get",
    "Get full vendor details by sys_id with contracts and vendor catalog items.",
    {
      sys_id: z.string().describe("The sys_id of the vendor (core_company record)"),
    },
    async ({ sys_id }) => {
      try {
        const [vendor, contracts, catalogItems] = await Promise.all([
          client.getById("core_company", sys_id),
          client.query("ast_contract", {
            sysparm_query: `vendor=${sys_id}^ORDERBYDESCstarts`,
            sysparm_fields: "sys_id,number,short_description,state,starts,ends,total_cost,po_number,sys_class_name",
            sysparm_limit: 20,
            sysparm_display_value: "true",
          }),
          client.query("pc_vendor_cat_item", {
            sysparm_query: `vendor=${sys_id}^ORDERBYproduct_name`,
            sysparm_fields: "sys_id,product_name,price,description,active",
            sysparm_limit: 20,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          vendor,
          contracts: { count: contracts.totalCount, records: contracts.records },
          catalogItems: { count: catalogItems.totalCount, records: catalogItems.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_vendor_type_list",
    "List vendor types (vendor_type). Shows vendor classifications (Hardware, Software, Services, Applications).",
    {},
    async () => {
      try {
        const result = await client.query("vendor_type", {
          sysparm_query: "ORDERBYname",
          sysparm_fields: "sys_id,name",
          sysparm_limit: 50,
        });
        return jsonResult({ count: result.records.length, types: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Contracts (ast_contract) ==========

  server.tool(
    "sn_contract_list",
    "List contracts (ast_contract). Track agreements with vendors including costs, dates, terms, and PO numbers.",
    {
      vendor: z.string().optional().describe("Filter by vendor name (contains match)"),
      state: z.string().optional().describe("Filter by state, e.g. 'Draft', 'Active', 'Expired'"),
      po_number: z.string().optional().describe("Filter by PO number (contains match)"),
      starts_after: z.string().optional().describe("Contracts starting after this date (YYYY-MM-DD)"),
      ends_before: z.string().optional().describe("Contracts ending before this date (YYYY-MM-DD)"),
      short_description: z.string().optional().describe("Filter by name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ vendor, state, po_number, starts_after, ends_before, short_description, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (vendor) queryParts.push(`vendor.nameLIKE${vendor}`);
        if (state) queryParts.push(`state=${state}`);
        if (po_number) queryParts.push(`po_numberLIKE${po_number}`);
        if (starts_after) queryParts.push(`starts>${starts_after}`);
        if (ends_before) queryParts.push(`ends<${ends_before}`);
        if (short_description) queryParts.push(`short_descriptionLIKE${short_description}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCstarts");

        const result = await client.query("ast_contract", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,vendor,state,substate,starts,ends,total_cost,monthly_cost,yearly_cost,po_number,payment_schedule,license_type,renewable,sys_class_name,contract_administrator,sys_updated_on",
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
    "sn_contract_get",
    "Get full contract details with terms & conditions, covered assets, and covered users.",
    {
      sys_id: z.string().describe("The sys_id of the contract"),
    },
    async ({ sys_id }) => {
      try {
        const [contract, terms, coveredAssets, coveredUsers] = await Promise.all([
          client.getById("ast_contract", sys_id),
          client.query("clm_m2m_contract_and_terms", {
            sysparm_query: `contract=${sys_id}`,
            sysparm_fields: "sys_id,terms_and_conditions,order",
            sysparm_limit: 20,
            sysparm_display_value: "true",
          }),
          client.query("clm_m2m_contract_asset", {
            sysparm_query: `contract=${sys_id}`,
            sysparm_fields: "sys_id,asset",
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("clm_m2m_contract_user", {
            sysparm_query: `contract=${sys_id}`,
            sysparm_fields: "sys_id,user",
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          contract,
          terms: { count: terms.totalCount, records: terms.records },
          coveredAssets: { count: coveredAssets.totalCount, records: coveredAssets.records },
          coveredUsers: { count: coveredUsers.totalCount, records: coveredUsers.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Legacy Purchase Orders (proc_po) ==========

  server.tool(
    "sn_purchase_order_list",
    "List legacy purchase orders (proc_po). For S2P purchase orders use sn_s2p_po_list instead.",
    {
      vendor: z.string().optional().describe("Filter by vendor name (contains match)"),
      status: z.string().optional().describe("Filter by status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ vendor, status, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (vendor) queryParts.push(`vendor.nameLIKE${vendor}`);
        if (status) queryParts.push(`status=${status}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCordered");

        const result = await client.query("proc_po", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,vendor,status,total_cost,ordered,due_by,expected_delivery,received,contract,requested_by,requested_for,ship_to,po_date,sys_updated_on",
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
    "sn_purchase_order_get",
    "Get legacy purchase order details with line items (proc_po / proc_po_item).",
    {
      sys_id: z.string().describe("The sys_id of the purchase order"),
    },
    async ({ sys_id }) => {
      try {
        const [po, lineItems] = await Promise.all([
          client.getById("proc_po", sys_id),
          client.query("proc_po_item", {
            sysparm_query: `purchase_order=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,short_description,model,part_number,ordered_quantity,received_quantity,remaining_quantity,list_price,cost,total_cost,status,vendor,request_line,requested_for",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({ purchaseOrder: po, lineItems: { count: lineItems.totalCount, records: lineItems.records } });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Cost Centers ==========

  server.tool(
    "sn_cost_center_list",
    "List cost centers (cmn_cost_center). Used for procurement cost allocation across contracts, POs, and expenses.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ name, limit }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("cmn_cost_center", {
          sysparm_query: queryParts.join("^"),
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });

        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Expense Lines ==========

  server.tool(
    "sn_expense_line_list",
    "List expense lines (fm_expense_line). Tracks costs from assets, contracts, and CIs for spend analysis.",
    {
      source_table: z.string().optional().describe("Filter by source table, e.g. 'ast_contract', 'alm_asset'"),
      cost_center: z.string().optional().describe("Filter by cost center name (contains match)"),
      amount_greater_than: z.coerce.number().optional().describe("Filter expenses greater than this amount"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ source_table, cost_center, amount_greater_than, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (source_table) queryParts.push(`source_table=${source_table}`);
        if (cost_center) queryParts.push(`cost_center.nameLIKE${cost_center}`);
        if (amount_greater_than !== undefined) queryParts.push(`amount>${amount_greater_than}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCamount");

        const result = await client.query("fm_expense_line", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,source,source_table,amount,cost_center,start_date,end_date,summary,annual_cost,monthly_cost,sys_updated_on",
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

  // ========== Approvals ==========

  server.tool(
    "sn_procurement_approval_list",
    "List approvals (sysapproval_approver). Track approval status for procurement requests, contracts, and POs. Debug stuck approvals.",
    {
      source_table: z.string().optional().describe("Filter by source table, e.g. 'sc_req_item', 'ast_contract', 'sn_shop_purchase_order'"),
      state: z.string().optional().describe("Filter by state: 'requested', 'approved', 'rejected', 'cancelled'"),
      approver: z.string().optional().describe("Filter by approver name (contains match)"),
      document_id: z.string().optional().describe("Filter by the sys_id of the document being approved"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ source_table, state, approver, document_id, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (source_table) queryParts.push(`source_table=${source_table}`);
        if (state) queryParts.push(`state=${state}`);
        if (approver) queryParts.push(`approver.nameLIKE${approver}`);
        if (document_id) queryParts.push(`document_id=${document_id}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sysapproval_approver", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,source_table,document_id,state,approver,group,expected_start,due_date,comments,sys_created_on,sys_updated_on",
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

  // ========== Transfer Orders & Stockrooms ==========

  server.tool(
    "sn_transfer_order_list",
    "List transfer orders (alm_transfer_order). Move assets between stockrooms as part of procurement fulfillment.",
    {
      stage: z.string().optional().describe("Filter by stage"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ stage, limit }) => {
      try {
        const queryParts: string[] = [];
        if (stage) queryParts.push(`stage=${stage}`);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("alm_transfer_order", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,stage,from_stockroom,to_stockroom,requested_by,sys_created_on,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });

        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_stockroom_list",
    "List stockrooms (alm_stockroom). Physical or virtual locations where assets are stored.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ name, limit }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("alm_stockroom", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,type,location,manager,assignment_group,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });

        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Spend Analysis ==========

  server.tool(
    "sn_procurement_spend_analysis",
    "Aggregate procurement spend analysis by vendor, cost center, or state. Uses contract data for spend visibility and budget reporting.",
    {
      group_by: z.enum(["vendor", "cost_center", "state", "payment_schedule", "license_type"]).describe("Dimension to group spend by"),
      active_only: z.boolean().optional().describe("Only active contracts (default true)"),
    },
    async ({ group_by, active_only }) => {
      try {
        const queryParts: string[] = [];
        if (active_only !== false) queryParts.push("active=true");

        const result = await client.aggregate("ast_contract", {
          sysparm_query: queryParts.join("^"),
          sysparm_group_by: group_by,
          sysparm_count: true,
          sysparm_sum_fields: "total_cost,monthly_cost,yearly_cost",
          sysparm_avg_fields: "total_cost",
        });

        return jsonResult({ groupBy: group_by, results: result });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Develop-only tools ==========

  if (mode !== "develop") return;

  server.tool(
    "sn_contract_create",
    "Create a new contract (ast_contract).",
    {
      short_description: z.string().describe("Contract name"),
      vendor: z.string().describe("Vendor sys_id (core_company)"),
      starts: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      ends: z.string().optional().describe("End date (YYYY-MM-DD)"),
      state: z.string().optional().describe("State, e.g. 'draft', 'active'"),
      po_number: z.string().optional().describe("Purchase order number"),
      total_cost: z.string().optional().describe("Total cost"),
      additional_fields: z.record(z.unknown()).optional().describe("Additional fields"),
    },
    async ({ short_description, vendor, starts, ends, state, po_number, total_cost, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, vendor, ...additional_fields };
        if (starts) body.starts = starts;
        if (ends) body.ends = ends;
        if (state) body.state = state;
        if (po_number) body.po_number = po_number;
        if (total_cost) body.total_cost = total_cost;

        const result = await client.create("ast_contract", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_contract_update",
    "Update an existing contract (ast_contract).",
    {
      sys_id: z.string().describe("The sys_id of the contract"),
      fields: z.record(z.unknown()).describe("Fields to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("ast_contract", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_vendor_create",
    "Create a new vendor (core_company with vendor=true).",
    {
      name: z.string().describe("Vendor company name"),
      vendor_type: z.string().optional().describe("Vendor type sys_id"),
      phone: z.string().optional().describe("Phone number"),
      website: z.string().optional().describe("Website URL"),
      additional_fields: z.record(z.unknown()).optional().describe("Additional fields"),
    },
    async ({ name, vendor_type, phone, website, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { name, vendor: true, ...additional_fields };
        if (vendor_type) body.vendor_type = vendor_type;
        if (phone) body.phone = phone;
        if (website) body.website = website;

        const result = await client.create("core_company", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_vendor_update",
    "Update an existing vendor (core_company).",
    {
      sys_id: z.string().describe("The sys_id of the vendor"),
      fields: z.record(z.unknown()).describe("Fields to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("core_company", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
