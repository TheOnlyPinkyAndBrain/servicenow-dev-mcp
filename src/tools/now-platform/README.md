# Now Platform (core)

Table/Aggregate/Attachment/Batch APIs, schema, scripting, admin, and diagnostics.

**Module folder:** `src/tools/now-platform/` · **Files:** 16 · **Tools:** 78

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_aggregate` | both | Get aggregate statistics (count, sum, avg, min, max) for any table. Useful for dashboards, diagnostics, and understanding data distribution without pulling individual records. |
| `sn_app_get` | both | Get full application scope details by sys_id |
| `sn_app_list` | both | List application scopes (sys_scope). Shows custom and store apps installed on the instance. |
| `sn_app_modules` | both | List application modules (navigation menu items) for an application or scope. Useful for understanding app navigation structure. |
| `sn_archive_rule_list` | both | List table archive rules (sys_archive) — rules that move aged records off active tables, with their condition, schedule, and estimated volume. |
| `sn_attachment_delete` | develop | Delete an attachment by sys_id |
| `sn_attachment_get` | both | Get attachment metadata by sys_id (file name, content type, size, table info) |
| `sn_attachment_list` | both | List attachments for a specific record or table. Returns metadata including file name, size, content type. |
| `sn_attachment_search` | both | Search attachments by file name, content type, or size across all tables |
| `sn_batch_request` | both | Execute multiple REST API calls in a single batch request (/api/now/v1/batch). Reduces round trips and improves performance by up to 66%. All requests must be independent (no data dependencies between them). |
| `sn_currency_list` | both | List currencies (fx_currency) — the currency codes/symbols configured on the instance for currency fields. |
| `sn_data_policy_for_table` | both | Find all active data policies and their rules for a specific table. Essential for debugging 'mandatory field' or 'read-only' errors when creating/updating records via API, import sets, or the UI. Returns policies with their conditions and field rules in one call. |
| `sn_data_policy_get` | both | Get a data policy by sys_id with all its field rules. Shows the policy conditions, which fields are mandatory or read-only, and where it applies (API, import sets, UI). |
| `sn_data_policy_list` | both | List data policies (sys_data_policy2). Data policies enforce mandatory and read-only rules server-side — they apply even via API and import sets, unlike UI policies. A common source of 'mandatory field' errors when creating/updating records via web services. |
| `sn_data_policy_rules` | both | List data policy rules (field-level enforcement) for a data policy. Shows which fields are set as mandatory or disabled/read-only by the policy. |
| `sn_diag_audit_trail` | both | Query audit trail (sys_audit) — shows field-level change history for any record |
| `sn_diag_cache_flushes` | both | List recent cache flush events — shows when and why caches were flushed |
| `sn_diag_cluster_nodes` | both | List cluster node status (sys_cluster_state) — shows all application nodes, their status, and build info |
| `sn_diag_deleted_records` | both | Query deleted records audit trail (sys_audit_delete) |
| `sn_diag_events` | both | List diagnostic events (cache flushes, node starts, plugin activations) from diagnostic_event table |
| `sn_diag_instance_scan_findings` | both | List instance scan findings — violations detected by the Instance Scan engine |
| `sn_diag_slow_queries` | both | List slow queries that exceeded the 5-second execution threshold |
| `sn_domain_list` | both | List domains (sys_domain) — the domain hierarchy for domain-separated instances |
| `sn_domain_overrides` | both | List domain overrides (sys_overrides) — domain-specific process separation records (business rules, notifications, etc.) |
| `sn_domain_visibility_group` | both | Check domain visibility grants for a group (sys_user_group_visibility) |
| `sn_domain_visibility_user` | both | Check domain visibility grants for a user (sys_user_visibility) |
| `sn_email_account_list` | both | List email account configurations (inbound/outbound SMTP/POP/IMAP settings) |
| `sn_email_failed` | both | List failed/errored emails — emails that could not be sent |
| `sn_email_get` | both | Get full email details including body, headers, and delivery info |
| `sn_email_list` | both | List email records (sys_email) — outbound and inbound emails. Filter by state, type, recipients, subject. |
| `sn_email_log` | both | Query email logs (sys_email) to debug email delivery. Shows recipient, subject, type, state, and errors. |
| `sn_email_template_list` | both | List email templates (sysevent_email_template) — reusable subject/body templates referenced by notifications. |
| `sn_email_trace` | both | Trace an email notification from event to delivery. Queries sysevent, notification, sys_email, and sys_email_log. |
| `sn_event_log` | both | Query the event log (sysevent) to trace event processing. Shows what events fired, their state, and processing details. |
| `sn_event_registry_list` | both | List registered system events (sysevent_register) — the event names a table can fire (used by notifications, flows, and business rules). |
| `sn_logs_get_transactions` | both | Query transaction logs — filter by URL, status, and time range |
| `sn_logs_query` | both | Query system logs (syslog) — filter by level, source, message text, and time range |
| `sn_notification_config_list` | both | List email notification configurations (sysevent_email_action) — what notifications exist and their conditions |
| `sn_notification_get` | both | Get full email notification details including message template, conditions, and recipients |
| `sn_notification_list` | both | List email notifications (sysevent_email_action). Shows notification name, table, event, conditions. Critical for debugging why emails are or aren't being sent. |
| `sn_report_list` | both | List reports (sys_report) — saved reports with source table, type, and grouping. Useful for auditing reporting and finding a report's definition. |
| `sn_schedule_list` | both | List schedules (cmn_schedule) — reusable time definitions (business hours, maintenance windows, holidays) used by SLAs, on-call, and jobs. |
| `sn_scheduled_job_history` | both | Get recent execution history for a scheduled job by checking sys_trigger runs |
| `sn_scheduled_job_list` | both | List scheduled job definitions (sysauto_script) — recurring and one-time scheduled scripts |
| `sn_scheduled_stuck_jobs` | both | Find stuck or orphaned scheduled jobs — triggers that are running or queued on nodes that may no longer exist |
| `sn_scheduled_trigger_list` | both | List scheduled execution triggers (sys_trigger) — the runtime state of scheduled items. Shows what's queued, running, or stuck. |
| `sn_schema_choices` | both | Get choice list values for a field (sys_choice). Returns all available dropdown/choice values for a given table field. |
| `sn_schema_columns` | both | List all columns/fields for a ServiceNow table (sys_dictionary). Returns field name, label, type, max length, mandatory, reference table, default value, and more. Essential for understanding a table's data model. |
| `sn_schema_references` | both | Find all reference fields pointing to or from a table. Helps understand relationships between tables. |
| `sn_schema_table_hierarchy` | both | Get the full inheritance hierarchy for a table — shows parent chain up to the base table and all direct child tables. Critical for understanding ServiceNow's table-per-hierarchy model. |
| `sn_schema_tables` | both | List or search ServiceNow tables (sys_db_object). Find tables by name or label. Returns table name, label, super_class, scope, and whether it's extendable. |
| `sn_scope_list` | both | List application scopes (sys_scope) — all scoped applications and their access modes |
| `sn_scope_pending_access` | both | List pending cross-scope access requests — requests awaiting admin approval |
| `sn_scope_privilege_list` | both | List cross-scope access privilege records (sys_scope_privilege) — shows what cross-scope access has been requested, allowed, or denied |
| `sn_scope_restricted_caller` | both | List restricted caller access records — controls which scoped apps can call which APIs |
| `sn_script_execute` | develop | Execute a server-side script on the ServiceNow instance using the native Background Scripts engine (sys.scripts.do). Has full access to GlideRecord, GlideSystem (gs), GlideAggregate, GlideDateTime, and all server-side APIs. Use gs.print() to produce output. Exactly like running a script in the Background Scripts UI. |
| `sn_script_execute_query` | develop | Execute a GlideRecord query via Background Scripts and return results as JSON. A convenience wrapper that builds the boilerplate for you — just specify table, query, and fields. |
| `sn_sys_property_get` | both | Get a system property value by exact name |
| `sn_sys_property_list` | both | List or search system properties (sys_properties). System properties control instance-wide behavior and configuration. |
| `sn_sys_property_set` | develop | Set a system property value. Creates the property if it doesn't exist. |
| `sn_sys_trigger_get` | both | Get full scheduled job trigger details by sys_id (sys_trigger) |
| `sn_sys_trigger_list` | both | List scheduled job triggers (sys_trigger). Shows job name, next action time, state, trigger type. Useful for debugging timing-related issues. For scheduled job definitions see sn_scheduled_job_list. |
| `sn_table_create` | develop | Create a new record in any ServiceNow table |
| `sn_table_delete` | develop | Delete a record from any ServiceNow table by sys_id (destructive) |
| `sn_table_get` | both | Get a single record from any ServiceNow table by sys_id |
| `sn_table_impact` | both | Analyze what customizations affect a table — lists all business rules, client scripts, UI policies, UI actions, ACLs, and script includes related to a specific table. Essential for debugging why a form/table behaves a certain way. |
| `sn_table_query` | both | Query records from any ServiceNow table with filters, pagination, and field selection |
| `sn_table_update` | develop | Update a record in any ServiceNow table by sys_id |
| `sn_template_list` | both | List record templates (sys_template) — reusable field-value presets applied to new records on a table. |
| `sn_update_set_changes` | both | List all customer updates (changes) in an update set. Shows what records were modified, their type, target table, and action. Essential for reviewing what an update set contains before promoting. |
| `sn_update_set_create` | develop | Create a new update set |
| `sn_update_set_get` | both | Get full update set details including description and state |
| `sn_update_set_list` | both | List update sets with state, application, and description. Core ServiceNow development workflow tool. |
| `sn_update_set_update` | develop | Update an existing update set (change state, name, description) |
| `sn_upgrade_customized_records` | both | List records customized from baseline (sys_update_xml where customer update is true) — shows what has been modified from out-of-box |
| `sn_upgrade_history` | both | List upgrade/patch history (sys_upgrade_history) — all upgrades and patches applied to this instance |
| `sn_upgrade_impact_summary` | both | Get a summary of upgrade impact — counts of skipped records by type for a given upgrade |
| `sn_upgrade_skipped_list` | both | List skipped upgrade records — customized records that were skipped during upgrade. These are high-priority items to review. |

---

↩ Back to the [main README](../../../README.md#modules).
