# IT Operations Management (ITOM)

Event management and alerting.

**Module folder:** `src/tools/it-operations-management/` · **Files:** 1 · **Tools:** 6

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_alert_get` | both | Get full alert details including related events and secondary alerts |
| `sn_alert_list` | both | List alerts (em_alert) — correlated alerts from events. Filter by severity, state, CI, group. |
| `sn_alert_update` | develop | Update an alert (acknowledge, assign, close, etc.) |
| `sn_event_list` | both | List events (em_event) — raw events before alert correlation. Filter by severity, source, node, time range. |
| `sn_event_push` | develop | Push an event to ServiceNow Event Management via the em/jsonv2 API |
| `sn_event_rule_list` | both | List event processing rules (em_event_rule) that transform raw events |

---

↩ Back to the [main README](../../../README.md#modules).
