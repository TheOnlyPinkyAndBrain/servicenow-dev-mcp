# IT Service Management (ITSM)

Incident, problem, change, SLA, and approval management.

**Module folder:** `src/tools/it-service-management/` · **Files:** 10 · **Tools:** 54

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_approval_for_task` | both | Get all approval records for a specific task/document with full history |
| `sn_approval_list` | both | List approval records (sysapproval_approver). Filter by state, approver, task, or time range. |
| `sn_approval_pending_for_user` | both | List pending approvals for a specific user |
| `sn_approval_stale` | both | Find stale approvals — requests that have been pending for more than N days |
| `sn_approval_update` | develop | Update an approval record (approve, reject, etc.) |
| `sn_cab_agenda_list` | both | List CAB meeting agenda items (cab_agenda_item) — the changes queued for review at a CAB meeting. |
| `sn_cab_meeting_list` | both | List Change Advisory Board (CAB) meetings (cab_meeting). Shows scheduled/held CAB meetings for reviewing changes. |
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
| `sn_change_conflict_check` | develop | Run conflict detection for a change request via the Change Management API (POST /api/sn_chg_rest/change/{sys_id}/conflict). Recomputes scheduling/CI conflicts and returns them — better than reading stale change_conflict rows. |
| `sn_change_create` | develop | Create a change request using the Change Management API (sn_chg_rest). Supports normal, standard, and emergency types. |
| `sn_change_get` | both | Get full change request details including change tasks, affected CIs, and approvals |
| `sn_change_list` | both | List change requests with filters for type, state, risk, assignment group, and time range |
| `sn_change_model_list` | both | List change models (chg_model) — the model-driven definitions that govern change types (normal, standard, emergency, and custom). Modern change management is model-based; use this to discover available models before creating a change. |
| `sn_change_standard_templates` | both | List standard change templates/proposals |
| `sn_change_task_create` | develop | Create a change task (change_task) under a change request. |
| `sn_change_task_list` | both | List change tasks for a change request or across all changes |
| `sn_change_update` | develop | Update an existing change request |
| `sn_cim_initiative_get` | both | Get a Continual Improvement initiative (sn_cim_register) by sys_id, together with its CIM tasks (sn_cim_task) and impacted KPIs (sn_cim_related_kpi). |
| `sn_cim_initiative_list` | both | List Continual Improvement initiatives (sn_cim_register) — improvement records tracking a target outcome/KPI. Requires the Continual Improvement Management plugin (com.sn_cim). |
| `sn_cim_task_list` | both | List Continual Improvement tasks (sn_cim_task) — work items under an improvement initiative. Requires the Continual Improvement Management plugin (com.sn_cim). |
| `sn_delegation_list` | both | List user delegation assignments (sys_user_delegate) |
| `sn_incident_create` | develop | Create a new incident |
| `sn_incident_get` | both | Get full incident details including related records (child incidents, tasks, SLAs, comments) |
| `sn_incident_list` | both | List incidents with filters for priority, state, assignment group, assigned_to, category, and time range |
| `sn_incident_major_list` | both | List major incidents (priority 1 or 2, or those flagged as major_incident_state) |
| `sn_incident_related_cis` | both | Get configuration items related to an incident via the task_ci relationship table |
| `sn_incident_task_list` | both | List incident tasks (incident_task) — sub-tasks created under an incident for parallel/assigned work. |
| `sn_incident_update` | develop | Update an existing incident |
| `sn_known_error_list` | both | List known errors — problems flagged as known_error=true with workarounds |
| `sn_oncall_member_list` | both | List on-call rotation members (cmn_rota_member) — the users assigned into an on-call rotation's rosters. Requires the On-Call Scheduling plugin. |
| `sn_oncall_rota_list` | both | List on-call rotations (cmn_rota) — recurring on-call schedules attached to assignment groups. Requires the On-Call Scheduling plugin. |
| `sn_problem_create` | develop | Create a new problem record |
| `sn_problem_get` | both | Get full problem details including related incidents and problem tasks |
| `sn_problem_list` | both | List problems with filters for priority, state, assignment group, category |
| `sn_problem_task_list` | both | List problem tasks (problem_task) — investigation/root-cause sub-tasks under a problem. |
| `sn_problem_update` | develop | Update an existing problem record |
| `sn_request_get` | both | Get a service catalog request (sc_request) by sys_id, together with its requested items (sc_req_item). |
| `sn_request_list` | both | List service catalog requests (sc_request) — the REQ header record that groups one or more requested items (RITMs). Use sn_ritm_list for the line items and sn_sc_task_list for fulfillment tasks. |
| `sn_ritm_list` | both | List requested items (sc_req_item) — catalog requests submitted by users. Useful for debugging catalog fulfillment. |
| `sn_sc_task_list` | both | List catalog tasks (sc_task) — fulfillment tasks for requested items |
| `sn_sla_definition_get` | both | Get full SLA definition details |
| `sn_sla_definition_list` | both | List SLA definitions (contract_sla). Shows SLA name, table, duration, and conditions. |
| `sn_task_sla_list` | both | List task SLA records (task_sla) — active SLA tracking instances attached to records. Shows actual SLA timers, their stage (in_progress, paused, breached), and timing details. |
| `sn_universal_request_list` | both | List Universal Requests (universal_request) — the single front-door request record that routes an employee's issue to the right department (IT, HR, etc.). Requires the Universal Request plugin. |
| `sn_walkup_queue_list` | both | List Walk-Up Experience location queues (wu_location_queue) — the queues configured for walk-up support locations. Requires the Walk-Up Experience plugin. (Walk-up visitor sessions themselves are stored as interaction records.) |

---

↩ Back to the [main README](../../../README.md#modules).
