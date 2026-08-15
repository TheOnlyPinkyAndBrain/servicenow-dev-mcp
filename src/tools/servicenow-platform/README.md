# ServiceNow Platform

CMDB (config items, IRE) and Knowledge Management.

**Module folder:** `src/tools/servicenow-platform/` · **Files:** 3 · **Tools:** 27

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_acl_create` | develop | Create a new ACL |
| `sn_acl_get` | both | Get full ACL details by sys_id, including script and condition |
| `sn_acl_list` | both | List ACLs, optionally filtered by table, operation, or type |
| `sn_acl_update` | develop | Update an existing ACL |
| `sn_cmdb_ci_get` | both | Get full Configuration Item details by sys_id, including all attributes |
| `sn_cmdb_ci_list` | both | List Configuration Items from the CMDB (cmdb_ci or any CI subclass). Supports searching across any CI class like cmdb_ci_server, cmdb_ci_app_server, cmdb_ci_service, etc. |
| `sn_cmdb_class_list` | both | List CMDB CI classes (cmdb_ci hierarchy). Shows available CI types and their hierarchy. |
| `sn_cmdb_identify_reconcile` | develop | Create or update CIs and their relationships through the Identification and Reconciliation API (POST /api/now/identifyreconcile). This is the supported way to write CMDB data from an external source: IRE matches on identification rules to avoid duplicate CIs and enforces reconciliation. Use for bulk/multi-CI payloads with relations. |
| `sn_cmdb_instance_create` | develop | Create a Configuration Item via the CMDB Instance API (POST /api/now/cmdb/instance/{class}). This routes through the Identification and Reconciliation Engine (IRE), so it deduplicates against existing CIs instead of blindly inserting. Prefer this over sn_table_create for CIs. |
| `sn_cmdb_instance_get` | both | Get a Configuration Item via the CMDB Instance API (/api/now/cmdb/instance). Returns the CI's attributes plus its inbound and outbound relations in a single call — richer than sn_cmdb_ci_get, which returns table columns only. |
| `sn_cmdb_instance_update` | develop | Update a Configuration Item via the CMDB Instance API (PATCH /api/now/cmdb/instance/{class}/{sys_id}). Applies reconciliation rules so trusted sources aren't overwritten by less-trusted data. |
| `sn_cmdb_rel_list` | both | List CMDB relationships for a Configuration Item. Shows parent/child, runs on, hosted on, and other dependency relationships. |
| `sn_knowledge_article_create` | develop | Create a knowledge article |
| `sn_knowledge_article_get` | both | Get a knowledge article by sys_id including full content |
| `sn_knowledge_article_list` | both | List knowledge articles with filters using the Table API for advanced queries |
| `sn_knowledge_article_update` | develop | Update a knowledge article |
| `sn_knowledge_base_list` | both | List knowledge bases |
| `sn_knowledge_category_list` | both | List knowledge categories for a knowledge base |
| `sn_knowledge_feedback` | both | List feedback for a knowledge article |
| `sn_knowledge_search` | both | Search knowledge base articles using the Knowledge API (sn_km_api). Returns matching articles with relevance ranking. |
| `sn_ui_action_get` | both | Get full UI Action details including script and conditions |
| `sn_ui_action_list` | both | List UI Actions (buttons, links, context menus) filtered by table |
| `sn_ui_policy_actions` | both | List UI Policy Actions for a given UI Policy sys_id (field visibility, mandatory, read-only settings) |
| `sn_ui_policy_create` | develop | Create a new UI Policy |
| `sn_ui_policy_get` | both | Get a UI Policy by sys_id, including its associated UI Policy Actions |
| `sn_ui_policy_list` | both | List UI Policies, optionally filtered by table or active status |
| `sn_ui_policy_update` | develop | Update an existing UI Policy |

---

↩ Back to the [main README](../../../README.md#modules).
