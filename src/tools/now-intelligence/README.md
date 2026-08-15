# Platform Analytics

Performance Analytics indicators, breakdowns, scorecards, dashboards.

**Module folder:** `src/tools/now-intelligence/` · **Files:** 1 · **Tools:** 7

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_pa_breakdown_list` | both | List Performance Analytics breakdowns (dimensions for drilling into indicators) |
| `sn_pa_dashboard_list` | both | List Performance Analytics dashboards |
| `sn_pa_indicator_list` | both | List Performance Analytics indicators |
| `sn_pa_scorecards` | both | Retrieve Performance Analytics scorecard data for an indicator. Returns scores, breakdowns, targets, and trends. |
| `sn_pa_target_list` | both | List Performance Analytics targets (pa_targets) — goal values set for an indicator (optionally per element/breakdown). |
| `sn_pa_threshold_list` | both | List Performance Analytics thresholds (pa_thresholds) — conditional score bands that trigger colors/notes when an indicator crosses a value. |
| `sn_pa_widget_list` | both | List Performance Analytics widgets (pa_widgets) — the visualizations (scorecards, charts, dials) placed on PA dashboards, tied to an indicator and optional breakdown. |

---

↩ Back to the [main README](../../../README.md#modules).
