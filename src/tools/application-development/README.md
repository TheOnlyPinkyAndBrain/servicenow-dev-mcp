# Application Development

Business rules & scripts, Flow Designer, legacy workflows, and CI/CD.

**Module folder:** `src/tools/application-development/` · **Files:** 4 · **Tools:** 26

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_atf_result_list` | both | List ATF test execution results |
| `sn_atf_step_list` | both | List ATF test steps (sys_atf_step) — the ordered steps within an Automated Test Framework test. |
| `sn_atf_suite_list` | both | List ATF test suites |
| `sn_atf_test_list` | both | List Automated Test Framework (ATF) tests |
| `sn_cicd_activate_plugin` | develop | Activate a plugin via the CI/CD API |
| `sn_cicd_apply_source_control` | develop | Apply source control changes via CI/CD API |
| `sn_cicd_run_test_suite` | develop | Run an ATF test suite via the CI/CD API (sn_cicd) |
| `sn_flow_action_type_list` | both | List Flow Designer action types (sys_hub_action_type_definition) — the catalog of available actions (from spokes and core) that flows and subflows can use. |
| `sn_flow_create` | develop | Create a new Flow Designer flow |
| `sn_flow_get` | both | Get full Flow Designer flow details by sys_id |
| `sn_flow_list` | both | List Flow Designer flows with status, scope, and trigger type |
| `sn_flow_list_actions` | both | List Flow Designer actions and subflows |
| `sn_flow_update` | develop | Update an existing Flow Designer flow |
| `sn_installed_app_list` | both | List installed applications (sys_store_app and sys_app) |
| `sn_plugin_list` | both | List installed/active plugins |
| `sn_script_create` | develop | Create a new script record (business rule, script include, client script, or fix script) |
| `sn_script_get` | both | Get full script details including source code by sys_id |
| `sn_script_list` | both | List scripts by type (business_rule, script_include, client_script, fix_script) — metadata only, no script body |
| `sn_script_search` | both | Search scripts by name or body text content |
| `sn_script_update` | develop | Update an existing script record |
| `sn_workflow_activities` | both | List activities (steps) in a workflow version. Shows activity type, name, and execution order. |
| `sn_workflow_context_list` | both | List running/completed workflow contexts (executions) for a record or workflow. Shows execution state, started/ended time. Essential for debugging workflow execution. |
| `sn_workflow_execution_history` | both | Get execution history for a workflow context — shows which activities ran, their result, and timing. The key tool for debugging why a workflow took a specific path. |
| `sn_workflow_get` | both | Get full workflow details by sys_id |
| `sn_workflow_list` | both | List legacy workflows (wf_workflow). Shows workflow name, table, and published status. Legacy workflows are still heavily used in many instances. |
| `sn_workflow_versions` | both | List workflow versions for a workflow. The published version is the one that runs. Useful for debugging which version of a workflow is active. |

---

↩ Back to the [main README](../../../README.md#modules).
