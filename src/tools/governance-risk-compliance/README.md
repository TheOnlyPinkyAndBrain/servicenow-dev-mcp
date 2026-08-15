# Governance, Risk & Compliance (GRC/IRM)

Policies, controls, risks, audits, and findings.

**Module folder:** `src/tools/governance-risk-compliance/` · **Files:** 1 · **Tools:** 6

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_grc_audit_list` | both | List audit engagements (sn_audit_engagement) |
| `sn_grc_control_list` | both | List GRC controls (sn_grc_control) — controls mapped to policies and profiles |
| `sn_grc_finding_list` | both | List GRC findings — issues discovered during audits, attestations, or control tests |
| `sn_grc_policy_list` | both | List GRC policies (sn_grc_policy) |
| `sn_grc_risk_create` | develop | Create a risk entry |
| `sn_grc_risk_list` | both | List risks (sn_risk_risk) — risk register entries |

---

↩ Back to the [main README](../../../README.md#modules).
