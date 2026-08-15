# Employee Service Management (HRSD)

HR cases, lifecycle events, services, and profiles.

**Module folder:** `src/tools/employee-service-management/` · **Files:** 1 · **Tools:** 7

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_hr_case_create` | develop | Create an HR case |
| `sn_hr_case_get` | both | Get full HR case details including tasks |
| `sn_hr_case_list` | both | List HR cases (sn_hr_core_case) — all HR case types including lifecycle events and employee relations |
| `sn_hr_case_update` | develop | Update an HR case |
| `sn_hr_lifecycle_event_list` | both | List HR lifecycle events (onboarding, offboarding, transfers, etc.) |
| `sn_hr_profile_get` | both | Look up an HR profile for a user |
| `sn_hr_service_list` | both | List HR services (COE services offered to employees) |

---

↩ Back to the [main README](../../../README.md#modules).
