# Application Development

Business rules & scripts, Flow Designer, Decision Tables, legacy workflows, CI/CD, and Agile Development (stories, epics, scrum tasks, projects).

**Module folder:** `src/tools/application-development/` · **Files:** 6 · **Tools:** 50

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_atf_result_list` | both | List ATF test execution results |
| `sn_atf_step_list` | both | List ATF test steps (sys_atf_step) — the ordered steps within an Automated Test Framework test. |
| `sn_atf_suite_list` | both | List ATF test suites |
| `sn_atf_test_list` | both | List Automated Test Framework (ATF) tests |
| `sn_atf_test_run` | develop | Execute a single ATF test (as opposed to sn_cicd_run_test_suite, which only runs whole suites) via the native ATF REST API. Requires the Automated Test Framework plugin (com.glide.automated-test-framework) and the atf_test_admin role. Execution is asynchronous — poll sn_atf_result_list with the returned result sys_id if the run doesn't resolve synchronously. |
| `sn_cicd_activate_plugin` | develop | Activate a plugin via the CI/CD API |
| `sn_cicd_apply_source_control` | develop | Apply source control changes via CI/CD API |
| `sn_cicd_run_test_suite` | develop | Run an ATF test suite via the CI/CD API (sn_cicd) |
| `sn_decision_table_create` | develop | Create a new Decision Table (sys_decision) container. Note: this creates the table definition itself, not its inputs or rule rows — those are typically added via the Decision Builder UI after the shell exists, since input variable types and row conditions are validated interactively against each other. |
| `sn_decision_table_get` | both | Get a Decision Table's definition together with its inputs (sys_decision_input) and rule rows (sys_decision_question, each a condition -> answer pair evaluated in order). |
| `sn_decision_table_list` | both | List Decision Tables (sys_decision) — reusable if/then rule sets (inputs -> conditions -> an answer) commonly referenced from Flow Designer flows and business rules instead of hardcoding branching logic. |
| `sn_decision_table_update` | develop | Update a Decision Table's definition (sys_decision) — name, description, status, active state. To modify inputs or rule rows, use sn_table_update against sys_decision_input / sys_decision_question directly. |
| `sn_epic_create` | develop | Create a new Agile Development epic (rm_epic). |
| `sn_epic_list` | both | List Agile Development epics (rm_epic). |
| `sn_epic_update` | develop | Update an existing Agile Development epic (rm_epic). |
| `sn_flow_action_type_list` | both | List Flow Designer action types (sys_hub_action_type_definition) — the catalog of available actions (from spokes and core) that flows and subflows can use. |
| `sn_flow_create` | develop | Create a new Flow Designer flow |
| `sn_flow_get` | both | Get full Flow Designer flow details by sys_id |
| `sn_flow_list` | both | List Flow Designer flows with status, scope, and trigger type |
| `sn_flow_list_actions` | both | List Flow Designer actions and subflows |
| `sn_flow_run` | develop | Run a Flow Designer flow or subflow synchronously by sys_id or scoped name (e.g. 'global.my_flow'), and return its outputs. Executes via the server-side Flow API (sn_fd.FlowAPI) since Flow Designer has no generic REST endpoint to invoke an arbitrary flow — only flows built with their own Inbound REST trigger get a dedicated webhook URL. |
| `sn_flow_update` | develop | Update an existing Flow Designer flow |
| `sn_installed_app_list` | both | List installed applications (sys_store_app and sys_app) |
| `sn_plugin_list` | both | List installed/active plugins |
| `sn_project_create` | develop | Create a new project (pm_project). |
| `sn_project_list` | both | List Agile/Project Management projects (pm_project). |
| `sn_project_update` | develop | Update an existing project (pm_project). |
| `sn_script_create` | develop | Create a new script record (business rule, script include, client script, or fix script) |
| `sn_script_get` | both | Get full script details including source code by sys_id |
| `sn_script_list` | both | List scripts by type (business_rule, script_include, client_script, fix_script) — metadata only, no script body |
| `sn_script_search` | both | Search scripts by name or body text content |
| `sn_script_update` | develop | Update an existing script record |
| `sn_scrum_task_create` | develop | Create a new scrum task (rm_scrum_task) under a story. |
| `sn_scrum_task_list` | both | List Agile Development scrum tasks (rm_scrum_task) — the work breakdown for a story. |
| `sn_scrum_task_update` | develop | Update an existing scrum task (rm_scrum_task). |
| `sn_story_create` | develop | Create a new Agile Development story (rm_story). |
| `sn_story_dependency_create` | develop | Create a dependency between two stories (m2m_story_dependencies) — marks one story as a prerequisite for another. |
| `sn_story_dependency_delete` | develop | Delete a story dependency (m2m_story_dependencies) by sys_id. |
| `sn_story_dependency_list` | both | List story dependencies (m2m_story_dependencies) — which stories block or depend on which. |
| `sn_story_list` | both | List Agile Development stories (rm_story). |
| `sn_story_update` | develop | Update an existing Agile Development story (rm_story). |
| `sn_workflow_activities` | both | List activities (steps) in a workflow version. Shows activity type, name, and execution order. |
| `sn_workflow_context_list` | both | List running/completed workflow contexts (executions) for a record or workflow. Shows execution state, started/ended time. Essential for debugging workflow execution. |
| `sn_workflow_create` | develop | Create a new legacy workflow (wf_workflow) container. Note: this creates the workflow record itself, not its activities/canvas — building activity logic (wf_activity, wf_transition) programmatically is fragile and best done in the Workflow Editor UI; this tool is meant for scripted setup of the workflow shell (name, table, description) ahead of manual activity design, or for updating metadata on an existing workflow. |
| `sn_workflow_delete` | develop | Delete a legacy workflow (wf_workflow) by sys_id. This deletes the workflow container itself, not necessarily its activities/versions — check for dependent records first if the workflow has been published. |
| `sn_workflow_execution_history` | both | Get execution history for a workflow context — shows which activities ran, their result, and timing. The key tool for debugging why a workflow took a specific path. |
| `sn_workflow_get` | both | Get full workflow details by sys_id |
| `sn_workflow_list` | both | List legacy workflows (wf_workflow). Shows workflow name, table, and published status. Legacy workflows are still heavily used in many instances. |
| `sn_workflow_update` | develop | Update an existing legacy workflow's metadata (name, table, description, active state) |
| `sn_workflow_versions` | both | List workflow versions for a workflow. The published version is the one that runs. Useful for debugging which version of a workflow is active. |

---

↩ Back to the [main README](../../../README.md#modules).
