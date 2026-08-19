---
source: https://github.com/michaelbuckner/servicenow-mcp
owner: michaelbuckner
repo: servicenow-mcp
first_discovered: 2026-08-19
last_synced: 2026-08-19
status: Not merged
language: Python
stars_at_last_sync: unknown
license: unknown
tool_count_theirs_at_last_sync: 10 tools + 7 MCP resources
tool_count_ours_at_last_sync: 376 tools / 54 modules
vector: status/not-merged lang/python scope/incident-demo area/incident area/table area/knowledge area/user gaps/0 idea/nlp-to-query
---

# michaelbuckner/servicenow-mcp

## Summary

Lightweight incident-focused demo/starter, single `server.py`. Tools: create/update_incident, search_records, get_record, perform_query, add/get_comment, add_work_notes, natural_language_search, natural_language_update, update_script. MCP resources cover incidents/users/knowledge/tables/schema. Not a scope competitor — everything here is a thin subset of this server's `sn_incident_*` + generic table layer.

## Gaps found

None.

## Design ideas noted

Server-side natural-language-to-query translation (`natural_language_search`/`natural_language_update`) — an LLM-in-the-loop layer that translates plain English into ServiceNow queries server-side. Not ported: the calling LLM already does this translation into `sn_table_query`/`sn_aggregate` calls for free; a server-side NLP layer would duplicate that capability.

## Decision & action

No action. Nothing in this repo justified a tool addition.

## Sync history

| Date | Tool counts (theirs / ours) | Result |
|---|---|---|
| 2026-08-19 | 10 + 7 resources / 376 | Initial evaluation — no action |
