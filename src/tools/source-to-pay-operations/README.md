# Source-to-Pay Operations

Procurement, sourcing, POs, suppliers, invoices, and finance.

**Module folder:** `src/tools/source-to-pay-operations/` · **Files:** 2 · **Tools:** 58

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_contract_create` | develop | Create a new contract (ast_contract). |
| `sn_contract_get` | both | Get full contract details with terms & conditions, covered assets, and covered users. |
| `sn_contract_list` | both | List contracts (ast_contract). Track agreements with vendors including costs, dates, terms, and PO numbers. |
| `sn_contract_update` | develop | Update an existing contract (ast_contract). |
| `sn_cost_center_list` | both | List cost centers (cmn_cost_center). Used for procurement cost allocation across contracts, POs, and expenses. |
| `sn_expense_line_list` | both | List expense lines (fm_expense_line). Tracks costs from assets, contracts, and CIs for spend analysis. |
| `sn_procurement_approval_list` | both | List approvals (sysapproval_approver). Track approval status for procurement requests, contracts, and POs. Debug stuck approvals. |
| `sn_procurement_spend_analysis` | both | Aggregate procurement spend analysis by vendor, cost center, or state. Uses contract data for spend visibility and budget reporting. |
| `sn_purchase_order_get` | both | Get legacy purchase order details with line items (proc_po / proc_po_item). |
| `sn_purchase_order_list` | both | List legacy purchase orders (proc_po). For S2P purchase orders use sn_s2p_po_list instead. |
| `sn_s2p_approval_plan_list` | both | List S2P approval plans (sn_shop_approval_plan). Shows the approval workflow configuration for requisitions, POs, and invoices. |
| `sn_s2p_delivery_location_list` | both | List S2P delivery locations (sn_shop_delivery_location). Locations where goods can be shipped. |
| `sn_s2p_erp_error_list` | both | List ERP integration errors (sn_shop_erp_error_task). Debug failed syncs between ServiceNow S2P and external ERP systems. |
| `sn_s2p_erp_source_list` | both | List ERP sources (sn_fin_erp_source). External ERP systems (SAP, Oracle) integrated with S2P. |
| `sn_s2p_gl_account_list` | both | List GL accounts (sn_fin_gl_account). Used for financial coding on POs, invoices, and cost allocations. |
| `sn_s2p_invoice_case_list` | both | List invoice cases (sn_ap_cm_ap_case). Cases are created for invoice disputes, payment issues, and exception resolution. Part of Invoice Case Management. |
| `sn_s2p_invoice_exception_list` | both | List invoice exceptions (sn_ap_apm_exception). Exceptions are raised when invoice matching fails — price variance, quantity mismatch, missing receipt, etc. Essential for debugging AP processing issues. |
| `sn_s2p_invoice_get` | both | Get full S2P invoice details with line items, tax lines, payment details, and exceptions. |
| `sn_s2p_invoice_list` | both | List S2P invoices (sn_shop_invoice). Invoices from suppliers linked to POs for matching and payment. Supports 2-way (PO↔Invoice) and 3-way (PO↔Receipt↔Invoice) matching. Core to Accounts Payable Operations. |
| `sn_s2p_invoice_update` | develop | Update an S2P invoice (sn_shop_invoice). |
| `sn_s2p_legal_entity_list` | both | List legal entities (sn_fin_legal_entity). The buying organizations in S2P — suppliers, POs, and invoices are linked to legal entities. |
| `sn_s2p_negotiation_list` | both | List negotiations (sn_shop_negotiation). Each negotiation represents a supplier's participation in a sourcing event — their bid, pricing, and award status. The procurement specialist evaluates negotiations to award a supplier. |
| `sn_s2p_payment_term_list` | both | List S2P payment terms (sn_shop_payment_term). Payment terms define when invoices are due (Net 30, Net 60, etc.). |
| `sn_s2p_period_list` | both | List fiscal periods (sn_fin_period). Used for financial reporting and invoice processing. |
| `sn_s2p_po_create` | develop | Create a new S2P purchase order (sn_shop_purchase_order). |
| `sn_s2p_po_get` | both | Get full S2P purchase order details with line items, receipts, cost allocations, and linked contracts. |
| `sn_s2p_po_line_list` | both | List S2P purchase order line items across all POs. Track ordered items by supplier, status, or find items pending receipt/invoice. |
| `sn_s2p_po_list` | both | List S2P purchase orders (sn_shop_purchase_order). These are the formal purchase orders in Source-to-Pay — created from approved requisitions and sent to suppliers. Tracks invoiced amounts, received amounts, and ERP sync status. |
| `sn_s2p_po_update` | develop | Update an S2P purchase order (sn_shop_purchase_order). |
| `sn_s2p_procurement_case_get` | both | Get full procurement case details with its line items and tasks. |
| `sn_s2p_procurement_case_list` | both | List procurement cases (sn_spend_psd_procurement_request). Procurement cases are requests from employees to the procurement team — 'I need a new laptop', 'We need a vendor for catering', etc. Extends Finance Case with task-like fields. |
| `sn_s2p_product_group_list` | both | List S2P product groups (sn_shop_product_group). Product groups categorize supplier products. |
| `sn_s2p_purchasing_entity_list` | both | List purchasing entities (sn_fin_purchasing_entity). Business units that can issue purchase orders, linked to legal entities and ERP sources. |
| `sn_s2p_receipt_list` | both | List S2P receipts (sn_shop_receipt). Receipts confirm goods/services received against PO lines. Required for 3-way invoice matching (PO → Receipt → Invoice). |
| `sn_s2p_requisition_get` | both | Get S2P purchase requisition details with its line items (sn_shop_line). |
| `sn_s2p_requisition_list` | both | List S2P purchase requisitions (sn_shop_purchase_requisition). Purchase requisitions are internal requests for goods/services that, once approved, become purchase orders. The starting point of the procurement workflow. |
| `sn_s2p_shipping_method_list` | both | List S2P shipping methods (sn_shop_shipping_method). |
| `sn_s2p_sourcing_event_get` | both | Get full sourcing event details with its sourcing requests, negotiations per supplier, and linked contracts. |
| `sn_s2p_sourcing_event_list` | both | List sourcing events (sn_shop_negotiation_event). Sourcing events (also called negotiation events) group sourcing requests for competitive bidding — RFQ, RFP, RFI, or reverse auction. Multiple sourcing requests can be bundled into one event. |
| `sn_s2p_sourcing_request_get` | both | Get full sourcing request details with its purchase lines, negotiation events, and sourcing tasks. |
| `sn_s2p_sourcing_request_list` | both | List sourcing requests (sn_shop_sourcing_activity). Sourcing requests are the starting point of the S2P sourcing workflow — employees submit requests for goods/services that procurement specialists review, add to negotiation events, and ultimately award to suppliers. |
| `sn_s2p_sourcing_task_list` | both | List sourcing tasks (sn_shop_sourcing_task). Tasks created during the sourcing process — manually by procurement specialists or auto-generated from decision tables. |
| `sn_s2p_supplier_create` | develop | Create a new S2P supplier (sn_fin_supplier). |
| `sn_s2p_supplier_get` | both | Get full S2P supplier details with legal entity mappings and payment information. |
| `sn_s2p_supplier_list` | both | List S2P suppliers (sn_fin_supplier). Rich supplier records with onboarding status, DUNS, tax ID, payment terms, shipping info, legal entity linkage, and risk assessment. Core to Source-to-Pay workflows. |
| `sn_s2p_supplier_product_list` | both | List S2P supplier products (sn_shop_supplier_product). Products and services offered by suppliers in the S2P catalog. |
| `sn_s2p_supplier_update` | develop | Update an S2P supplier (sn_fin_supplier). |
| `sn_s2p_task_list` | both | List S2P purchasing tasks (sn_shop_task). Tasks generated from the procurement workflow — acknowledgements, follow-ups, and other action items. |
| `sn_s2p_tax_code_list` | both | List tax codes (sn_fin_tax_code). Tax codes applied to invoice lines and PO lines. |
| `sn_s2p_tolerance_rule_list` | both | List invoice tolerance rules (sn_ap_apm_invoice_tolerance_rule). Define acceptable variance thresholds for invoice matching — when exceeded, exceptions are raised. |
| `sn_s2p_uom_list` | both | List units of measure (sn_fin_uom). UOMs for invoice and PO line quantities. |
| `sn_stockroom_list` | both | List stockrooms (alm_stockroom). Physical or virtual locations where assets are stored. |
| `sn_transfer_order_list` | both | List transfer orders (alm_transfer_order). Move assets between stockrooms as part of procurement fulfillment. |
| `sn_vendor_create` | develop | Create a new vendor (core_company with vendor=true). |
| `sn_vendor_get` | both | Get full vendor details by sys_id with contracts and vendor catalog items. |
| `sn_vendor_list` | both | List vendors (core_company where vendor=true). Platform-level vendor records. For S2P suppliers with richer financial data use sn_s2p_supplier_list instead. |
| `sn_vendor_type_list` | both | List vendor types (vendor_type). Shows vendor classifications (Hardware, Software, Services, Applications). |
| `sn_vendor_update` | develop | Update an existing vendor (core_company). |

---

↩ Back to the [main README](../../../README.md#modules).
