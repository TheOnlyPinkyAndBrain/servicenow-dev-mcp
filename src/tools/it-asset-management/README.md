# IT Asset Management (ITAM)

Hardware/software assets, licenses, installs, and models.

**Module folder:** `src/tools/it-asset-management/` · **Files:** 1 · **Tools:** 8

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_asset_create` | develop | Create a new asset record |
| `sn_asset_get` | both | Get full asset details including related CI, contracts, and consumables |
| `sn_asset_list` | both | List IT assets (alm_asset) with filters for status, model, location, assigned_to |
| `sn_asset_update` | develop | Update an existing asset record |
| `sn_hardware_list` | both | List hardware assets (alm_hardware) — servers, workstations, network devices, etc. |
| `sn_license_list` | both | List software licenses (alm_license) — entitlements, compliance status, counts |
| `sn_model_list` | both | List product/asset models (cmdb_model) — hardware models, software models, consumable models |
| `sn_software_install_list` | both | List software installations detected on CIs (cmdb_sam_sw_install) |

---

↩ Back to the [main README](../../../README.md#modules).
