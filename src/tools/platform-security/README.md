# Platform Security

ACLs, roles, and access control.

**Module folder:** `src/tools/platform-security/` · **Files:** 2 · **Tools:** 16

Read-only tools (`both`) work in `debug` and `develop` modes; `develop` tools require `SERVICENOW_MODE=develop`.

| Tool | Mode | Description |
|------|------|-------------|
| `sn_acl_create` | develop | Create a new ACL (sys_security_acl) |
| `sn_acl_get` | both | Get full ACL details by sys_id, including script and condition |
| `sn_acl_list` | both | List ACLs (sys_security_acl), optionally filtered by table, operation, or type |
| `sn_acl_roles` | both | List the roles required by an ACL (sys_security_acl_role) — the role-to-ACL mappings that determine which roles satisfy an access control. Useful for debugging why a user can/can't access a record. |
| `sn_acl_update` | develop | Update an existing ACL (sys_security_acl) |
| `sn_group_list` | both | List ServiceNow groups (sys_user_group). Search by name, type, or manager. |
| `sn_group_members` | both | List members of a group (sys_user_grmember) |
| `sn_group_roles` | both | List roles assigned to a group (sys_group_has_role) |
| `sn_ldap_server_list` | both | List LDAP server configurations (ldap_server_config) — directory servers used for import/authentication. Credentials are not returned. |
| `sn_oauth_entity_list` | both | List OAuth application registries (oauth_entity) — OAuth clients/providers configured on the instance. Secrets are not returned. |
| `sn_role_contains` | both | List roles contained within a role (sys_user_role_contains). Shows role inheritance hierarchy. |
| `sn_role_list` | both | List roles (sys_user_role). Shows role name, description, and elevated privilege status. |
| `sn_user_criteria_list` | both | List user criteria (user_criteria) — reusable access-control definitions (by role/group/user/company/dept/location) used to gate catalog items and knowledge. |
| `sn_user_groups` | both | List groups a user belongs to (sys_user_grmember). Useful for debugging assignment and access. |
| `sn_user_list` | both | List ServiceNow users (sys_user). Search by name, email, role, or group membership. |
| `sn_user_roles` | both | List roles assigned to a user (sys_user_has_role). Essential for debugging access/permission issues. |

---

↩ Back to the [main README](../../../README.md#modules).
