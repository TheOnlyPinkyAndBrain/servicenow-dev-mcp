# IT Service Management (ITSM)

Incident, problem, change, SLA, and approval management.

**Module folder:** `src/tools/it-service-management/` · **Files:** 6 · **Tools:** 38

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_approval_for_task` | both | Get all approval records for a specific task/document with full history |
| `sn_approval_list` | both | List approval records (sysapproval_approver). Filter by state, approver, task, or time range. |
| `sn_approval_pending_for_user` | both | List pending approvals for a specific user |
| `sn_approval_stale` | both | Find stale approvals — requests that have been pending for more than N days |
| `sn_approval_update` | develop | Update an approval record (approve, reject, etc.) |
| `sn_catalog_cart_add` | develop | Add a catalog item to the current user's cart via the Service Catalog API (POST /api/sn_sc/servicecatalog/items/{id}/add_to_cart). Use with sn_catalog_cart_get and sn_catalog_cart_submit to build a multi-item order. |
| `sn_catalog_cart_get` | develop | Get the current user's catalog cart contents via the Service Catalog API (GET /api/sn_sc/servicecatalog/cart). Shows items staged for checkout. |
| `sn_catalog_cart_submit` | develop | Submit the current user's cart as an order via the Service Catalog API (POST /api/sn_sc/servicecatalog/cart/submit_order). Creates the request (REQ) from all staged cart items. |
| `sn_catalog_category_list` | both | List service catalog categories (sc_category). Shows category hierarchy and structure. |
| `sn_catalog_client_script_get` | both | Get full catalog client script details including the script source |
| `sn_catalog_client_script_list` | both | List catalog client scripts (catalog_script_client) for a catalog item. These control form behavior in the service portal/catalog. |
| `sn_catalog_item_get` | both | Get full catalog item details by sys_id, including its variables |
| `sn_catalog_item_list` | both | List service catalog items (sc_cat_item). Shows item name, category, price, availability. |
| `sn_catalog_order_now` | develop | Order a catalog item directly via the Service Catalog API (POST /api/sn_sc/servicecatalog/items/{id}/order_now). Submits the request in one call, bypassing the cart. Returns the generated request (REQ) and requested item (RITM). |
| `sn_catalog_variable_sets` | both | List variable sets (io_set_item) assigned to a catalog item. Variable sets are reusable groups of variables. |
| `sn_change_create` | develop | Create a change request using the Change Management API (sn_chg_rest). Supports normal, standard, and emergency types. |
| `sn_change_get` | both | Get full change request details including change tasks, affected CIs, and approvals |
| `sn_change_list` | both | List change requests with filters for type, state, risk, assignment group, and time range |
| `sn_change_standard_templates` | both | List standard change templates/proposals |
| `sn_change_task_list` | both | List change tasks for a change request or across all changes |
| `sn_change_update` | develop | Update an existing change request |
| `sn_delegation_list` | both | List user delegation assignments (sys_user_delegate) |
| `sn_incident_create` | develop | Create a new incident |
| `sn_incident_get` | both | Get full incident details including related records (child incidents, tasks, SLAs, comments) |
| `sn_incident_list` | both | List incidents with filters for priority, state, assignment group, assigned_to, category, and time range |
| `sn_incident_major_list` | both | List major incidents (priority 1 or 2, or those flagged as major_incident_state) |
| `sn_incident_related_cis` | both | Get configuration items related to an incident via the task_ci relationship table |
| `sn_incident_update` | develop | Update an existing incident |
| `sn_known_error_list` | both | List known errors — problems flagged as known_error=true with workarounds |
| `sn_problem_create` | develop | Create a new problem record |
| `sn_problem_get` | both | Get full problem details including related incidents and problem tasks |
| `sn_problem_list` | both | List problems with filters for priority, state, assignment group, category |
| `sn_problem_update` | develop | Update an existing problem record |
| `sn_ritm_list` | both | List requested items (sc_req_item) — catalog requests submitted by users. Useful for debugging catalog fulfillment. |
| `sn_sc_task_list` | both | List catalog tasks (sc_task) — fulfillment tasks for requested items |
| `sn_sla_definition_get` | both | Get full SLA definition details |
| `sn_sla_definition_list` | both | List SLA definitions (contract_sla). Shows SLA name, table, duration, and conditions. |
| `sn_task_sla_list` | both | List task SLA records (task_sla) — active SLA tracking instances attached to records. Shows actual SLA timers, their stage (in_progress, paused, breached), and timing details. |

---

↩ Back to the [main README](../../../README.md#modules).
