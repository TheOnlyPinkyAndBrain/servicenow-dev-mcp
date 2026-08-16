# Security Operations (SecOps)

Security incidents, vulnerabilities, and threat intelligence.

**Module folder:** `src/tools/security-management/` · **Files:** 1 · **Tools:** 7

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_security_incident_create` | develop | Create a security incident |
| `sn_security_incident_get` | both | Get full security incident details including observables and affected CIs |
| `sn_security_incident_list` | both | List security incidents (sn_si_incident) |
| `sn_security_incident_update` | develop | Update a security incident |
| `sn_threat_observable_list` | both | List threat intelligence observables (sn_ti_observable) — IPs, domains, file hashes flagged as threats |
| `sn_vulnerability_entry_list` | both | List vulnerability entries from NVD (sn_vul_nvd_entry) |
| `sn_vulnerability_list` | both | List vulnerable items (sn_vul_vulnerable_item) — CIs with known vulnerabilities |

---

↩ Back to the [main README](../../../README.md#modules).
