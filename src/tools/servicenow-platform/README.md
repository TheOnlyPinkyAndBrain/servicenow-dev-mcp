# ServiceNow Platform

CMDB (config items, IRE) and Knowledge Management.

**Module folder:** `src/tools/servicenow-platform/` · **Files:** 4 · **Tools:** 28

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_business_app_list` | both | List business applications (cmdb_ci_business_app) — the Business Application CIs in the CSDM Application layer. |
| `sn_cmdb_ci_get` | both | Get full Configuration Item details by sys_id, including all attributes |
| `sn_cmdb_ci_list` | both | List Configuration Items from the CMDB (cmdb_ci or any CI subclass). Supports searching across any CI class like cmdb_ci_server, cmdb_ci_app_server, cmdb_ci_service, etc. |
| `sn_cmdb_class_list` | both | List CMDB CI classes (cmdb_ci hierarchy). Shows available CI types and their hierarchy. |
| `sn_cmdb_health_list` | both | List CMDB Health results (cmdb_health_result) — per-CI data-quality findings (completeness, correctness, compliance) produced by CMDB Health jobs. |
| `sn_cmdb_identify_reconcile` | develop | Create or update CIs and their relationships through the Identification and Reconciliation API (POST /api/now/identifyreconcile). This is the supported way to write CMDB data from an external source: IRE matches on identification rules to avoid duplicate CIs and enforces reconciliation. Use for bulk/multi-CI payloads with relations. |
| `sn_cmdb_instance_create` | develop | Create a Configuration Item via the CMDB Instance API (POST /api/now/cmdb/instance/{class}). This routes through the Identification and Reconciliation Engine (IRE), so it deduplicates against existing CIs instead of blindly inserting. Prefer this over sn_table_create for CIs. |
| `sn_cmdb_instance_get` | both | Get a Configuration Item via the CMDB Instance API (/api/now/cmdb/instance). Returns the CI's attributes plus its inbound and outbound relations in a single call — richer than sn_cmdb_ci_get, which returns table columns only. |
| `sn_cmdb_instance_update` | develop | Update a Configuration Item via the CMDB Instance API (PATCH /api/now/cmdb/instance/{class}/{sys_id}). Applies reconciliation rules so trusted sources aren't overwritten by less-trusted data. |
| `sn_cmdb_rel_create` | develop | Create a CMDB relationship (cmdb_rel_ci) between two CIs. Provide parent and child CI sys_ids and the relationship type sys_id (see sn_cmdb_rel_type_list). |
| `sn_cmdb_rel_list` | both | List CMDB relationships for a Configuration Item. Shows parent/child, runs on, hosted on, and other dependency relationships. |
| `sn_cmdb_rel_type_list` | both | List CMDB relationship types (cmdb_rel_type) — the defined relationship kinds (e.g. 'Runs on::Runs', 'Depends on::Used by') available for CI relationships. |
| `sn_interaction_get` | both | Get an interaction (interaction) by sys_id along with its related records (interaction_related_record) — the tasks and knowledge articles linked to it. |
| `sn_interaction_list` | both | List interactions (interaction) — omni-channel contacts (chat, phone, walk-up, messaging). Filter by state, channel type, assignee, or requester. |
| `sn_knowledge_article_create` | develop | Create a knowledge article |
| `sn_knowledge_article_get` | both | Get a knowledge article by sys_id including full content |
| `sn_knowledge_article_list` | both | List knowledge articles with filters using the Table API for advanced queries |
| `sn_knowledge_article_update` | develop | Update a knowledge article |
| `sn_knowledge_article_versions` | both | List version history for a knowledge article (kb_version). Shows each captured version of an article as it was published/updated over time. |
| `sn_knowledge_base_create` | develop | Create a new knowledge base (kb_knowledge_base) — the top-level container articles and categories belong to. |
| `sn_knowledge_base_list` | both | List knowledge bases |
| `sn_knowledge_block_list` | both | List Knowledge Blocks (kb_knowledge_block) — reusable content blocks embedded across articles. Requires the Knowledge Blocks plugin (com.snc.knowledge_blocks). |
| `sn_knowledge_category_create` | develop | Create a new knowledge category (kb_category) within a knowledge base, optionally nested under a parent category. |
| `sn_knowledge_category_list` | both | List knowledge categories for a knowledge base |
| `sn_knowledge_feedback` | both | List feedback for a knowledge article |
| `sn_knowledge_search` | both | Search knowledge base articles using the Knowledge API (sn_km_api). Returns matching articles with relevance ranking. |
| `sn_service_offering_list` | both | List service offerings (service_offering) — the consumable commitments of a business/technical service (CSDM). Includes status, owner, and support group. |
| `sn_skill_list` | both | List skills (cmn_skill) — competency definitions used by skill-based routing and Advanced Work Assignment. |

---

↩ Back to the [main README](../../../README.md#modules).
