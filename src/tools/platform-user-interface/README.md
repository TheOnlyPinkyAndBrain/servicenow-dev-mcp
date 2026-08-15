# Platform User Interface

UI policies/actions/pages and Service Portal.

**Module folder:** `src/tools/platform-user-interface/` · **Files:** 3 · **Tools:** 22

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_form_layout` | both | Get the form layout (sys_ui_element) for a table — shows which fields appear on the form and their positions. Critical for understanding form customization. |
| `sn_form_sections` | both | List form sections (sys_ui_section) for a table. Shows the layout structure of a form. |
| `sn_portal_angular_provider_list` | both | List Angular providers (factories, services, directives) used in Service Portal |
| `sn_portal_list` | both | List Service Portal portals (sp_portal) |
| `sn_portal_page_list` | both | List Service Portal pages (sp_page) |
| `sn_portal_theme_list` | both | List Service Portal themes |
| `sn_portal_widget_get` | both | Get full widget details including HTML template, client script, server script, and CSS |
| `sn_portal_widget_list` | both | List Service Portal widgets (sp_widget) |
| `sn_related_lists` | both | List related lists configured for a table (sys_ui_related_list_entry). Shows which related lists appear on a form. |
| `sn_ui_action_get` | both | Get full UI Action details (sys_ui_action) including script and conditions |
| `sn_ui_action_list` | both | List UI Actions (sys_ui_action) — buttons, links, context menus — filtered by table |
| `sn_ui_macro_list` | both | List UI Macros (sys_ui_macro) — reusable Jelly template components |
| `sn_ui_page_get` | both | Get full UI Page details including HTML, client script, and processing script |
| `sn_ui_page_list` | both | List UI Pages (sys_ui_page) — Jelly-based pages used across the platform. Includes processor pages and custom pages. |
| `sn_ui_policy_actions` | both | List UI Policy Actions (sys_ui_policy_action) for a UI Policy — field visibility, mandatory, and read-only settings |
| `sn_ui_policy_create` | develop | Create a new UI Policy (sys_ui_policy) |
| `sn_ui_policy_get` | both | Get a UI Policy by sys_id, including its associated UI Policy Actions |
| `sn_ui_policy_list` | both | List UI Policies (sys_ui_policy), optionally filtered by table or active status |
| `sn_ui_policy_update` | develop | Update an existing UI Policy (sys_ui_policy) |
| `sn_ui_script_get` | both | Get full UI Script details including source code |
| `sn_ui_script_list` | both | List UI Scripts (sys_ui_script) — global client-side JavaScript libraries loaded on pages |
| `sn_ui_view_list` | both | List form/list views (sys_ui_view) — named alternate layouts (e.g. 'Default view', 'ESS', 'ess') that tables can present. |

---

↩ Back to the [main README](../../../README.md#modules).
