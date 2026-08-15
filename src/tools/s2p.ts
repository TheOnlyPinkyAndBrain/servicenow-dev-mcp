import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../client.js";
import type { Mode } from "../types.js";
import { errorResult, jsonResult } from "../utils.js";

export function registerS2pTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // =====================================================================
  // Source-to-Pay Common Architecture (sn_shop scope)
  // =====================================================================

  // ========== Sourcing Requests (sn_shop_sourcing_activity) ==========

  server.tool(
    "sn_s2p_sourcing_request_list",
    "List sourcing requests (sn_shop_sourcing_activity). Sourcing requests are the starting point of the S2P sourcing workflow — employees submit requests for goods/services that procurement specialists review, add to negotiation events, and ultimately award to suppliers.",
    {
      status: z.string().optional().describe("Filter by status"),
      sourcing_stage: z.string().optional().describe("Filter by sourcing stage"),
      request_type: z.string().optional().describe("Filter by request type"),
      supplier: z.string().optional().describe("Filter by supplier name (contains match)"),
      business_owner: z.string().optional().describe("Filter by business owner name (contains match)"),
      product_name: z.string().optional().describe("Filter by product name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ status, sourcing_stage, request_type, supplier, business_owner, product_name, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (status) queryParts.push(`status=${status}`);
        if (sourcing_stage) queryParts.push(`sourcing_stage=${sourcing_stage}`);
        if (request_type) queryParts.push(`request_type=${request_type}`);
        if (supplier) queryParts.push(`supplier.numberLIKE${supplier}`);
        if (business_owner) queryParts.push(`business_owner.nameLIKE${business_owner}`);
        if (product_name) queryParts.push(`product_nameLIKE${product_name}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_sourcing_activity", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,display_name,status,sourcing_stage,type,request_type,product_name,product_category,product_model,supplier,business_owner,submitted_by,max_budget,benchmark_price,negotiation_event,rfq_status,rfq_id,sourcing_close_date,expected_delivery_date,erp_number,erp_source,sys_updated_on",
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
    "sn_s2p_sourcing_request_get",
    "Get full sourcing request details with its purchase lines, negotiation events, and sourcing tasks.",
    {
      sys_id: z.string().describe("The sys_id of the sourcing request"),
    },
    async ({ sys_id }) => {
      try {
        const [request, lines, tasks, negotiations] = await Promise.all([
          client.getById("sn_shop_sourcing_activity", sys_id),
          client.query("sn_shop_line", {
            sysparm_query: `purchase_order.sourcing_activity=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,short_description,supplier,state,total_line_amount,individual_unit_cost,total_individual_units,uom,product_type,recipient",
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_sourcing_task", {
            sysparm_query: `parent=${sys_id}^ORDERBYnumber`,
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_negotiation", {
            sysparm_query: `sourcing_activity=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,supplier,negotiation_stage,negotiation_type,negotiation_outcome,negotiation_event,objectives",
            sysparm_limit: 20,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          sourcingRequest: request,
          purchaseLines: { count: lines.totalCount, records: lines.records },
          tasks: { count: tasks.totalCount, records: tasks.records },
          negotiations: { count: negotiations.totalCount, records: negotiations.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Sourcing Events (sn_shop_negotiation_event) ==========

  server.tool(
    "sn_s2p_sourcing_event_list",
    "List sourcing events (sn_shop_negotiation_event). Sourcing events (also called negotiation events) group sourcing requests for competitive bidding — RFQ, RFP, RFI, or reverse auction. Multiple sourcing requests can be bundled into one event.",
    {
      negotiation_event_stage: z.string().optional().describe("Filter by event stage"),
      negotiation_type: z.string().optional().describe("Filter by negotiation type (RFQ, RFP, etc.)"),
      rfq_status: z.string().optional().describe("Filter by RFX status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ negotiation_event_stage, negotiation_type, rfq_status, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (negotiation_event_stage) queryParts.push(`negotiation_event_stage=${negotiation_event_stage}`);
        if (negotiation_type) queryParts.push(`negotiation_type=${negotiation_type}`);
        if (rfq_status) queryParts.push(`rfq_status=${rfq_status}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_negotiation_event", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,display_name,negotiation_event_stage,negotiation_type,negotiation_outcome,rfq_status,objectives,sourcing_close_date,erp_number,erp_source,flag_for_integration,sys_updated_on",
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
    "sn_s2p_sourcing_event_get",
    "Get full sourcing event details with its sourcing requests, negotiations per supplier, and linked contracts.",
    {
      sys_id: z.string().describe("The sys_id of the sourcing event"),
    },
    async ({ sys_id }) => {
      try {
        const [event, sourcingRequests, negotiations, contracts] = await Promise.all([
          client.getById("sn_shop_negotiation_event", sys_id),
          client.query("sn_shop_sourcing_activity", {
            sysparm_query: `negotiation_event=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,product_name,status,sourcing_stage,supplier,max_budget,business_owner",
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_negotiation", {
            sysparm_query: `negotiation_event=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,supplier,negotiation_stage,negotiation_type,negotiation_outcome,objectives",
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_m2m_negotiation_contract", {
            sysparm_query: `negotiation.negotiation_event=${sys_id}`,
            sysparm_fields: "sys_id,negotiation,contract",
            sysparm_limit: 20,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          sourcingEvent: event,
          sourcingRequests: { count: sourcingRequests.totalCount, records: sourcingRequests.records },
          negotiations: { count: negotiations.totalCount, records: negotiations.records },
          linkedContracts: { count: contracts.totalCount, records: contracts.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Negotiations (sn_shop_negotiation) ==========

  server.tool(
    "sn_s2p_negotiation_list",
    "List negotiations (sn_shop_negotiation). Each negotiation represents a supplier's participation in a sourcing event — their bid, pricing, and award status. The procurement specialist evaluates negotiations to award a supplier.",
    {
      negotiation_stage: z.string().optional().describe("Filter by stage"),
      negotiation_outcome: z.string().optional().describe("Filter by outcome (e.g. 'awarded', 'rejected')"),
      supplier: z.string().optional().describe("Filter by supplier name (contains match)"),
      negotiation_event: z.string().optional().describe("Filter by sourcing event sys_id"),
      sourcing_activity: z.string().optional().describe("Filter by sourcing request sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ negotiation_stage, negotiation_outcome, supplier, negotiation_event, sourcing_activity, query, limit }) => {
      try {
        const queryParts: string[] = [];
        if (negotiation_stage) queryParts.push(`negotiation_stage=${negotiation_stage}`);
        if (negotiation_outcome) queryParts.push(`negotiation_outcome=${negotiation_outcome}`);
        if (supplier) queryParts.push(`supplier.numberLIKE${supplier}`);
        if (negotiation_event) queryParts.push(`negotiation_event=${negotiation_event}`);
        if (sourcing_activity) queryParts.push(`sourcing_activity=${sourcing_activity}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_negotiation", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,supplier,negotiation_stage,negotiation_type,negotiation_outcome,negotiation_event,sourcing_activity,objectives,business_owner,erp_source,flag_for_integration,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });

        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Sourcing Tasks (sn_shop_sourcing_task) ==========

  server.tool(
    "sn_s2p_sourcing_task_list",
    "List sourcing tasks (sn_shop_sourcing_task). Tasks created during the sourcing process — manually by procurement specialists or auto-generated from decision tables.",
    {
      state: z.string().optional().describe("Filter by state"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ state, query, limit }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_sourcing_task", {
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

  // ========== S2P Suppliers (sn_fin_supplier) ==========

  server.tool(
    "sn_s2p_supplier_list",
    "List S2P suppliers (sn_fin_supplier). Rich supplier records with onboarding status, DUNS, tax ID, payment terms, shipping info, legal entity linkage, and risk assessment. Core to Source-to-Pay workflows.",
    {
      name: z.string().optional().describe("Filter by supplier number/name (contains match)"),
      onboarded: z.string().optional().describe("Filter by onboarding status, e.g. 'yes', 'no'"),
      preferred: z.string().optional().describe("Filter by preferred status"),
      registration_country: z.string().optional().describe("Filter by country of registration"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ name, onboarded, preferred, registration_country, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`numberLIKE${name}`);
        if (onboarded) queryParts.push(`onboarded=${onboarded}`);
        if (preferred) queryParts.push(`preferred=${preferred}`);
        if (registration_country) queryParts.push(`registration_country=${registration_country}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYnumber");

        const result = await client.query("sn_fin_supplier", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,related_company,onboarded,onboarded_date,onboarded_by,preferred,registration_country,tax_id,duns,primary_phone_number,gl_account,legal_entities,purchasing_entities,payment_term,shipping_lead,shipping_estimate,risk_assessed,valid_nda,sys_updated_on",
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
    "sn_s2p_supplier_get",
    "Get full S2P supplier details with legal entity mappings and payment information.",
    {
      sys_id: z.string().describe("The sys_id of the supplier"),
    },
    async ({ sys_id }) => {
      try {
        const [supplier, details, payments] = await Promise.all([
          client.getById("sn_fin_supplier", sys_id),
          client.query("sn_fin_supplier_detail", {
            sysparm_query: `supplier=${sys_id}`,
            sysparm_fields: "sys_id,supplier,legal_entity,supplier_number,supplier_site",
            sysparm_limit: 20,
            sysparm_display_value: "true",
          }),
          client.query("sn_fin_supplier_payment", {
            sysparm_query: `supplier=${sys_id}`,
            sysparm_limit: 10,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          supplier,
          legalEntityMappings: { count: details.totalCount, records: details.records },
          paymentInfo: { count: payments.totalCount, records: payments.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== S2P Purchase Requisitions (sn_shop_purchase_requisition) ==========

  server.tool(
    "sn_s2p_requisition_list",
    "List S2P purchase requisitions (sn_shop_purchase_requisition). Purchase requisitions are internal requests for goods/services that, once approved, become purchase orders. The starting point of the procurement workflow.",
    {
      status: z.string().optional().describe("Filter by status"),
      supplier: z.string().optional().describe("Filter by supplier name (contains match)"),
      number: z.string().optional().describe("Filter by requisition number"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ status, supplier, number, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (status) queryParts.push(`status=${status}`);
        if (supplier) queryParts.push(`supplier.numberLIKE${supplier}`);
        if (number) queryParts.push(`number=${number}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_purchase_requisition", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,display_name,status,supplier,total_amount,cost_center,business_owner,primary_contact,legal_entity,purchasing_entity,expected_delivery,erp_number,created,sys_updated_on",
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
    "sn_s2p_requisition_get",
    "Get S2P purchase requisition details with its line items (sn_shop_line).",
    {
      sys_id: z.string().describe("The sys_id of the purchase requisition"),
    },
    async ({ sys_id }) => {
      try {
        const [requisition, lines] = await Promise.all([
          client.getById("sn_shop_purchase_requisition", sys_id),
          client.query("sn_shop_line", {
            sysparm_query: `purchase_order=${sys_id}^sys_class_name=sn_shop_line^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,short_description,supplier,state,total_line_amount,individual_unit_cost,total_individual_units,uom,product_type,recipient,expected_delivery_date,general_ledger_account,goods_receipt_required,sys_class_name",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          requisition,
          lines: { count: lines.totalCount, records: lines.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== S2P Purchase Orders (sn_shop_purchase_order) ==========

  server.tool(
    "sn_s2p_po_list",
    "List S2P purchase orders (sn_shop_purchase_order). These are the formal purchase orders in Source-to-Pay — created from approved requisitions and sent to suppliers. Tracks invoiced amounts, received amounts, and ERP sync status.",
    {
      status: z.string().optional().describe("Filter by status"),
      supplier: z.string().optional().describe("Filter by supplier name (contains match)"),
      number: z.string().optional().describe("Filter by PO number"),
      legal_entity: z.string().optional().describe("Filter by legal entity sys_id"),
      purchasing_entity: z.string().optional().describe("Filter by purchasing entity sys_id"),
      purchase_order_type: z.string().optional().describe("Filter by order type"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ status, supplier, number, legal_entity, purchasing_entity, purchase_order_type, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (status) queryParts.push(`status=${status}`);
        if (supplier) queryParts.push(`supplier.numberLIKE${supplier}`);
        if (number) queryParts.push(`number=${number}`);
        if (legal_entity) queryParts.push(`legal_entity=${legal_entity}`);
        if (purchasing_entity) queryParts.push(`purchasing_entity=${purchasing_entity}`);
        if (purchase_order_type) queryParts.push(`purchase_order_type=${purchase_order_type}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCcreated");

        const result = await client.query("sn_shop_purchase_order", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,display_name,status,supplier,total_amount,invoiced_amount,received_amount,received_percentage,remaining_amount,cost_center,business_owner,primary_contact,legal_entity,purchasing_entity,purchase_order_type,payment_term,expected_delivery,erp_number,erp_source,erp_sync_failed,created,sys_updated_on",
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
    "sn_s2p_po_get",
    "Get full S2P purchase order details with line items, receipts, cost allocations, and linked contracts.",
    {
      sys_id: z.string().describe("The sys_id of the purchase order"),
    },
    async ({ sys_id }) => {
      try {
        const [po, lines, receipts, costAllocations, contracts] = await Promise.all([
          client.getById("sn_shop_purchase_order", sys_id),
          client.query("sn_shop_purchase_order_line", {
            sysparm_query: `purchase_order=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,short_description,supplier,state,total_line_amount,individual_unit_cost,total_individual_units,uom,sku,product_type,recipient,expected_delivery_date,invoiced_quantity,invoiced_percent,goods_receipt_required",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_receipt", {
            sysparm_query: `purchase_order_line.purchase_order=${sys_id}^ORDERBYDESCreceived`,
            sysparm_fields: "sys_id,number,purchase_order_line,quantity_received,amount_received,percentage_received,received,received_by,status,type",
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_cost_allocation", {
            sysparm_query: `order_line.purchase_order=${sys_id}`,
            sysparm_fields: "sys_id,order_line,cost_center,cost_owner,allocation_type,allocation_percentage,allocation_amount",
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_m2m_order_contract", {
            sysparm_query: `order=${sys_id}`,
            sysparm_limit: 10,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          purchaseOrder: po,
          lines: { count: lines.totalCount, records: lines.records },
          receipts: { count: receipts.totalCount, records: receipts.records },
          costAllocations: { count: costAllocations.totalCount, records: costAllocations.records },
          linkedContracts: { count: contracts.totalCount, records: contracts.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== S2P PO Lines (sn_shop_purchase_order_line) ==========

  server.tool(
    "sn_s2p_po_line_list",
    "List S2P purchase order line items across all POs. Track ordered items by supplier, status, or find items pending receipt/invoice.",
    {
      supplier: z.string().optional().describe("Filter by supplier name (contains match)"),
      state: z.string().optional().describe("Filter by line item state"),
      has_remaining: z.boolean().optional().describe("Only show lines not fully invoiced (invoiced_percent < 100)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ supplier, state, has_remaining, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (supplier) queryParts.push(`supplier.numberLIKE${supplier}`);
        if (state) queryParts.push(`state=${state}`);
        if (has_remaining) queryParts.push("invoiced_percent<100");
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_purchase_order_line", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,purchase_order,short_description,supplier,state,total_line_amount,individual_unit_cost,total_individual_units,sku,invoiced_quantity,invoiced_percent,goods_receipt_required,expected_delivery_date",
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

  // ========== S2P Receipts (sn_shop_receipt) ==========

  server.tool(
    "sn_s2p_receipt_list",
    "List S2P receipts (sn_shop_receipt). Receipts confirm goods/services received against PO lines. Required for 3-way invoice matching (PO → Receipt → Invoice).",
    {
      status: z.string().optional().describe("Filter by status"),
      purchase_order_line: z.string().optional().describe("Filter by PO line sys_id"),
      received_after: z.string().optional().describe("Received after this date (YYYY-MM-DD)"),
      received_before: z.string().optional().describe("Received before this date (YYYY-MM-DD)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ status, purchase_order_line, received_after, received_before, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (status) queryParts.push(`status=${status}`);
        if (purchase_order_line) queryParts.push(`purchase_order_line=${purchase_order_line}`);
        if (received_after) queryParts.push(`received>${received_after}`);
        if (received_before) queryParts.push(`received<${received_before}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCreceived");

        const result = await client.query("sn_shop_receipt", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,purchase_order_line,quantity_received,amount_received,percentage_received,received,received_by,status,type,erp_gr_number,erp_source,milestone,shipment_detail",
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

  // ========== S2P Invoices (sn_shop_invoice) ==========

  server.tool(
    "sn_s2p_invoice_list",
    "List S2P invoices (sn_shop_invoice). Invoices from suppliers linked to POs for matching and payment. Supports 2-way (PO↔Invoice) and 3-way (PO↔Receipt↔Invoice) matching. Core to Accounts Payable Operations.",
    {
      state: z.string().optional().describe("Filter by status"),
      supplier: z.string().optional().describe("Filter by supplier name (contains match)"),
      purchase_order: z.string().optional().describe("Filter by purchase order sys_id"),
      approval: z.string().optional().describe("Filter by approval status"),
      type: z.string().optional().describe("Filter by invoice type"),
      number: z.string().optional().describe("Filter by invoice number"),
      external_invoice_number: z.string().optional().describe("Filter by external/supplier invoice number"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ state, supplier, purchase_order, approval, type, number, external_invoice_number, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (supplier) queryParts.push(`supplier.numberLIKE${supplier}`);
        if (purchase_order) queryParts.push(`purchase_order=${purchase_order}`);
        if (approval) queryParts.push(`approval=${approval}`);
        if (type) queryParts.push(`type=${type}`);
        if (number) queryParts.push(`number=${number}`);
        if (external_invoice_number) queryParts.push(`external_invoice_number=${external_invoice_number}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_invoice", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,supplier,purchase_order,invoice_amount,subtotal,tax_amount,total_line_amount,invoice_date,due_date,payment_date,approval,type,channel,legal_entity,payment_terms,external_invoice_number,supplier_invoice_number,erp_integration_status,erp_source,erp_sync_failed,submitted_by,business_owner,sys_updated_on",
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
    "sn_s2p_invoice_get",
    "Get full S2P invoice details with line items, tax lines, payment details, and exceptions.",
    {
      sys_id: z.string().describe("The sys_id of the invoice"),
    },
    async ({ sys_id }) => {
      try {
        const [invoice, lines, taxLines, payments, exceptions] = await Promise.all([
          client.getById("sn_shop_invoice", sys_id),
          client.query("sn_shop_invoice_line", {
            sysparm_query: `invoice=${sys_id}^ORDERBYnumber`,
            sysparm_fields: "sys_id,number,line_description,line_amount,line_unit_price,invoiced_quantity,uom,tax_amount,purchase_order,order_line,state,approval,cost_center,ledger_account,supplier_part_number,supplier_invoice_line_number",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_invoice_tax_line", {
            sysparm_query: `invoice=${sys_id}`,
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sn_shop_invoice_payment_detail", {
            sysparm_query: `invoice=${sys_id}`,
            sysparm_limit: 10,
            sysparm_display_value: "true",
          }),
          client.query("sn_ap_apm_exception", {
            sysparm_query: `invoice=${sys_id}`,
            sysparm_fields: "sys_id,number,short_description,status,exception,variance_value,variance_percentage,tolerance_value,tolerance_percentage",
            sysparm_limit: 20,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          invoice,
          lineItems: { count: lines.totalCount, records: lines.records },
          taxLines: { count: taxLines.totalCount, records: taxLines.records },
          paymentDetails: { count: payments.totalCount, records: payments.records },
          exceptions: { count: exceptions.totalCount, records: exceptions.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Invoice Exceptions (sn_ap_apm_exception) ==========

  server.tool(
    "sn_s2p_invoice_exception_list",
    "List invoice exceptions (sn_ap_apm_exception). Exceptions are raised when invoice matching fails — price variance, quantity mismatch, missing receipt, etc. Essential for debugging AP processing issues.",
    {
      status: z.string().optional().describe("Filter by status"),
      invoice: z.string().optional().describe("Filter by invoice sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ status, invoice, query, limit }) => {
      try {
        const queryParts: string[] = [];
        if (status) queryParts.push(`status=${status}`);
        if (invoice) queryParts.push(`invoice=${invoice}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_ap_apm_exception", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,description,status,invoice,exception,variance_value,variance_percentage,tolerance_value,tolerance_percentage,tolerance_rule,bypass_reason,sys_created_on,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });

        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Invoice Cases (sn_ap_cm_ap_case) ==========

  server.tool(
    "sn_s2p_invoice_case_list",
    "List invoice cases (sn_ap_cm_ap_case). Cases are created for invoice disputes, payment issues, and exception resolution. Part of Invoice Case Management.",
    {
      category: z.string().optional().describe("Filter by category"),
      state: z.string().optional().describe("Filter by state"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ category, state, query, limit }) => {
      try {
        const queryParts: string[] = [];
        if (category) queryParts.push(`category=${category}`);
        if (state) queryParts.push(`state=${state}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_ap_cm_ap_case", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,category,sub_category,channel,source_record,source_record_table,invoice_stage,duplicate_case,closure_details,sys_created_on,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });

        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Procurement Cases (sn_spend_psd_procurement_request) ==========

  server.tool(
    "sn_s2p_procurement_case_list",
    "List procurement cases (sn_spend_psd_procurement_request). Procurement cases are requests from employees to the procurement team — 'I need a new laptop', 'We need a vendor for catering', etc. Extends Finance Case with task-like fields.",
    {
      state: z.string().optional().describe("Filter by state"),
      priority: z.string().optional().describe("Filter by priority (1-5)"),
      assigned_to: z.string().optional().describe("Filter by assigned user name (contains match)"),
      opened_by: z.string().optional().describe("Filter by requester name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ state, priority, assigned_to, opened_by, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (priority) queryParts.push(`priority=${priority}`);
        if (assigned_to) queryParts.push(`assigned_to.nameLIKE${assigned_to}`);
        if (opened_by) queryParts.push(`opened_by.nameLIKE${opened_by}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_spend_psd_procurement_request", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,state,priority,assigned_to,assignment_group,opened_by,opened_at,closed_at,description,work_notes,sys_updated_on",
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
    "sn_s2p_procurement_case_get",
    "Get full procurement case details with its line items and tasks.",
    {
      sys_id: z.string().describe("The sys_id of the procurement case"),
    },
    async ({ sys_id }) => {
      try {
        const [procCase, lines, tasks] = await Promise.all([
          client.getById("sn_spend_psd_procurement_request", sys_id),
          client.query("sn_spend_psd_procurement_request_line", {
            sysparm_query: `parent=${sys_id}^ORDERBYnumber`,
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sn_spend_psd_procurement_task", {
            sysparm_query: `parent=${sys_id}^ORDERBYnumber`,
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          procurementCase: procCase,
          lines: { count: lines.totalCount, records: lines.records },
          tasks: { count: tasks.totalCount, records: tasks.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== S2P Approval Plans ==========

  server.tool(
    "sn_s2p_approval_plan_list",
    "List S2P approval plans (sn_shop_approval_plan). Shows the approval workflow configuration for requisitions, POs, and invoices.",
    {
      approving_table: z.string().optional().describe("Filter by table being approved, e.g. 'sn_shop_purchase_order'"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ approving_table, query, limit }) => {
      try {
        const queryParts: string[] = [];
        if (approving_table) queryParts.push(`approving_table=${approving_table}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYsequence");

        const result = await client.query("sn_shop_approval_plan", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,approving_table,approving_record,approval_rule,approval_rule_type,approval_decision_method,approval_routing_method,approval_group,approver_list,approver_group_list,business_owner,primary_contact,sequence,approval_amount",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });

        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== S2P Purchasing Tasks ==========

  server.tool(
    "sn_s2p_task_list",
    "List S2P purchasing tasks (sn_shop_task). Tasks generated from the procurement workflow — acknowledgements, follow-ups, and other action items.",
    {
      state: z.string().optional().describe("Filter by state"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ state, query, limit }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_task", {
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

  // ========== S2P Supplier Products ==========

  server.tool(
    "sn_s2p_supplier_product_list",
    "List S2P supplier products (sn_shop_supplier_product). Products and services offered by suppliers in the S2P catalog.",
    {
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_supplier_product", {
          sysparm_query: queryParts.join("^"),
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

  // ========== S2P Configuration & Reference Data ==========

  server.tool(
    "sn_s2p_payment_term_list",
    "List S2P payment terms (sn_shop_payment_term). Payment terms define when invoices are due (Net 30, Net 60, etc.).",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_shop_payment_term", {
          sysparm_query: "ORDERBYname",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_delivery_location_list",
    "List S2P delivery locations (sn_shop_delivery_location). Locations where goods can be shipped.",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_shop_delivery_location", {
          sysparm_query: "ORDERBYname",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_shipping_method_list",
    "List S2P shipping methods (sn_shop_shipping_method).",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_shop_shipping_method", {
          sysparm_query: "ORDERBYname",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_product_group_list",
    "List S2P product groups (sn_shop_product_group). Product groups categorize supplier products.",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_shop_product_group", {
          sysparm_query: "ORDERBYname",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Finance Common Architecture ==========

  server.tool(
    "sn_s2p_legal_entity_list",
    "List legal entities (sn_fin_legal_entity). The buying organizations in S2P — suppliers, POs, and invoices are linked to legal entities.",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_fin_legal_entity", {
          sysparm_query: "ORDERBYname",
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
    "sn_s2p_purchasing_entity_list",
    "List purchasing entities (sn_fin_purchasing_entity). Business units that can issue purchase orders, linked to legal entities and ERP sources.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ name, limit }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        queryParts.push("ORDERBYname");

        const result = await client.query("sn_fin_purchasing_entity", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,number,legal_entity,erp_source,erp_number,sys_updated_on",
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
    "sn_s2p_gl_account_list",
    "List GL accounts (sn_fin_gl_account). Used for financial coding on POs, invoices, and cost allocations.",
    {
      display_name: z.string().optional().describe("Filter by account name (contains match)"),
      type: z.string().optional().describe("Filter by account type"),
      inactive: z.boolean().optional().describe("Filter by inactive status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    async ({ display_name, type, inactive, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (display_name) queryParts.push(`display_nameLIKE${display_name}`);
        if (type) queryParts.push(`type=${type}`);
        if (inactive !== undefined) queryParts.push(`inactive=${inactive}`);
        queryParts.push("ORDERBYdisplay_name");

        const result = await client.query("sn_fin_gl_account", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,display_name,gl_account,type,category,legal_entity,erp_source,account_currency,inactive,sys_updated_on",
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
    "sn_s2p_tax_code_list",
    "List tax codes (sn_fin_tax_code). Tax codes applied to invoice lines and PO lines.",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_fin_tax_code", {
          sysparm_query: "ORDERBYname",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_erp_source_list",
    "List ERP sources (sn_fin_erp_source). External ERP systems (SAP, Oracle) integrated with S2P.",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_fin_erp_source", {
          sysparm_query: "ORDERBYname",
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
    "sn_s2p_period_list",
    "List fiscal periods (sn_fin_period). Used for financial reporting and invoice processing.",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_fin_period", {
          sysparm_query: "ORDERBYDESCstart_date",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_uom_list",
    "List units of measure (sn_fin_uom). UOMs for invoice and PO line quantities.",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_fin_uom", {
          sysparm_query: "ORDERBYname",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== ERP Integration Errors ==========

  server.tool(
    "sn_s2p_erp_error_list",
    "List ERP integration errors (sn_shop_erp_error_task). Debug failed syncs between ServiceNow S2P and external ERP systems.",
    {
      state: z.string().optional().describe("Filter by state"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ state, query, limit }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_shop_erp_error_task", {
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

  // ========== Invoice Tolerance Rules ==========

  server.tool(
    "sn_s2p_tolerance_rule_list",
    "List invoice tolerance rules (sn_ap_apm_invoice_tolerance_rule). Define acceptable variance thresholds for invoice matching — when exceeded, exceptions are raised.",
    {
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    async ({ limit }) => {
      try {
        const result = await client.query("sn_ap_apm_invoice_tolerance_rule", {
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // ========== Develop-only tools ==========

  if (mode !== "develop") return;

  server.tool(
    "sn_s2p_supplier_create",
    "Create a new S2P supplier (sn_fin_supplier).",
    {
      related_company: z.string().describe("Related company sys_id (core_company)"),
      registration_country: z.string().optional().describe("Country of registration"),
      tax_id: z.string().optional().describe("Tax ID"),
      duns: z.string().optional().describe("DUNS number"),
      gl_account: z.string().optional().describe("GL account sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    async ({ related_company, registration_country, tax_id, duns, gl_account, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { related_company, ...additional_fields };
        if (registration_country) body.registration_country = registration_country;
        if (tax_id) body.tax_id = tax_id;
        if (duns) body.duns = duns;
        if (gl_account) body.gl_account = gl_account;

        const result = await client.create("sn_fin_supplier", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_supplier_update",
    "Update an S2P supplier (sn_fin_supplier).",
    {
      sys_id: z.string().describe("The sys_id of the supplier"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("sn_fin_supplier", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_po_create",
    "Create a new S2P purchase order (sn_shop_purchase_order).",
    {
      supplier: z.string().describe("Supplier sys_id (sn_fin_supplier)"),
      display_name: z.string().optional().describe("PO display name"),
      purchasing_entity: z.string().optional().describe("Purchasing entity sys_id"),
      legal_entity: z.string().optional().describe("Legal entity sys_id"),
      cost_center: z.string().optional().describe("Cost center sys_id"),
      payment_term: z.string().optional().describe("Payment term sys_id"),
      expected_delivery: z.string().optional().describe("Expected delivery date (YYYY-MM-DD)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    async ({ supplier, display_name, purchasing_entity, legal_entity, cost_center, payment_term, expected_delivery, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { supplier, ...additional_fields };
        if (display_name) body.display_name = display_name;
        if (purchasing_entity) body.purchasing_entity = purchasing_entity;
        if (legal_entity) body.legal_entity = legal_entity;
        if (cost_center) body.cost_center = cost_center;
        if (payment_term) body.payment_term = payment_term;
        if (expected_delivery) body.expected_delivery = expected_delivery;

        const result = await client.create("sn_shop_purchase_order", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_po_update",
    "Update an S2P purchase order (sn_shop_purchase_order).",
    {
      sys_id: z.string().describe("The sys_id of the purchase order"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("sn_shop_purchase_order", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_s2p_invoice_update",
    "Update an S2P invoice (sn_shop_invoice).",
    {
      sys_id: z.string().describe("The sys_id of the invoice"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("sn_shop_invoice", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
