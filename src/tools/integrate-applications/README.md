# Integration

REST messages, Import Sets/transform maps, and integration/middleware diagnostics.

**Module folder:** `src/tools/integrate-applications/` · **Files:** 3 · **Tools:** 22

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_data_source_list` | both | List data sources (sys_data_source) — the import connectors (file, JDBC, REST, LDAP) that feed import set tables. |
| `sn_ecc_queue_list` | both | List ECC Queue records (ecc_queue) — external communication channel for MID server. Shows stuck, errored, or processing records. |
| `sn_ecc_queue_stuck` | both | Find stuck ECC Queue records — items processing for too long, indicating MID server issues |
| `sn_import_set_list` | both | List import sets (sys_import_set). Shows import set name, table, state, and row counts. Useful for debugging data import issues. |
| `sn_import_set_rows` | both | List import set rows for an import set. Shows individual row data, state, and any error messages. |
| `sn_integration_hub_log` | both | Query Integration Hub execution logs for flow actions and spokes |
| `sn_mid_server_list` | both | List MID Server agents (ecc_agent) — status, version, host info |
| `sn_rest_api_create` | develop | Create a new Scripted REST API definition |
| `sn_rest_api_get` | both | Get full Scripted REST API details with all its resources/endpoints (sys_ws_operation) |
| `sn_rest_api_list` | both | List Scripted REST APIs (sys_ws_definition). Shows API name, namespace, base URI, and whether it's active. |
| `sn_rest_api_resource_create` | develop | Create a new Scripted REST API resource/endpoint |
| `sn_rest_api_resource_get` | both | Get full details of a Scripted REST API resource/endpoint including its script (sys_ws_operation) |
| `sn_rest_api_resource_update` | develop | Update a Scripted REST API resource/endpoint |
| `sn_rest_message_fn_list` | both | List HTTP methods for a REST message (sys_rest_message_fn) — GET, POST, PUT, etc. |
| `sn_rest_message_list` | both | List REST message definitions (sys_rest_message) — outbound REST integration configurations |
| `sn_rest_transaction_log` | both | Query REST API transaction logs — inbound REST calls to this instance |
| `sn_scheduled_import_list` | both | List scheduled data imports (scheduled_import_set) — recurring jobs that pull from a data source and run a transform map. |
| `sn_soap_message_list` | both | List outbound SOAP messages (sys_soap_message) — configured SOAP web-service integrations, with their WSDL and authentication type. |
| `sn_transform_map_get` | both | Get a transform map with all its field mappings. Shows how source columns map to target fields, including any transform scripts. |
| `sn_transform_map_list` | both | List transform maps (sys_transform_map). Shows mapping between import set tables and target tables. |
| `sn_transform_map_scripts` | both | List transform scripts (onBefore, onAfter, onStart, onComplete, onForeignInsert) for a transform map |
| `sn_web_service_list` | both | List inbound SOAP web services (sys_web_service) — scripted SOAP endpoints exposed by the instance. |

---

↩ Back to the [main README](../../../README.md#modules).
