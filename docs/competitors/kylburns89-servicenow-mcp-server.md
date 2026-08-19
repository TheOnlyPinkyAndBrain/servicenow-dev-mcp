---
source: https://github.com/kylburns89/servicenow-mcp-server
owner: kylburns89
repo: servicenow-mcp-server
first_discovered: 2026-08-19
last_synced: 2026-08-19
status: Merged
language: TypeScript
stars_at_last_sync: 0
license: unknown
tool_count_theirs_at_last_sync: 41 tools / 10 files
tool_count_ours_at_last_sync: 376 tools / 54 modules (before) -> 378 tools (after)
vector: status/merged lang/typescript stars/0 area/incident area/change area/cmdb area/catalog area/knowledge area/user area/table area/bulk area/attachment area/atf area/cicd gap/attachment-upload gap/atf-single-run merged/sn_attachment_create merged/sn_atf_test_run
---

# kylburns89/servicenow-mcp-server

## Summary

Mid-sized, ITSM-centric — incidents, changes, CMDB, catalog, knowledge, users, table, bulk, attachments, developer/CI-CD. Same MCP SDK (`McpServer`/`registerTool`) as this server. This server's equivalents were broader in every overlapping category.

## Gaps found

1. `servicenow_upload_attachment` — this server had list/get/search/delete for attachments but no create/upload.
2. `servicenow_run_atf_test` — this server's ATF tools were list-only; nothing could trigger a single-test run (only whole-suite runs via the CI/CD API).
3. (Lower value, not pursued) `get_instance_info`, named `bulk_update`/`bulk_delete` tools — both already reachable via the generic layer.

## Design ideas noted

None beyond the gaps above.

## Decision & action

Merged 2026-08-19.
- `sn_attachment_create` — added to [attachment.ts](../../src/tools/now-platform/attachment.ts); required a new binary-body client method (`attachmentUpload` in [client.ts](../../src/client.ts)) since the generic `request()` helper always JSON-encodes.
- `sn_atf_test_run` — added to [cicd.ts](../../src/tools/application-development/cicd.ts), calling the native `/api/now/v1/atf/test/run` endpoint (confirmed via ServiceNow docs that the CI/CD API's `/api/sn_cicd/testsuite/run` only supports suite-level runs, not single tests).
- Version bumped 3.14.0 → 3.15.0.

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| 2026-08-19 | 41 / 376 → 378 | Merged: `sn_attachment_create`, `sn_atf_test_run` |
