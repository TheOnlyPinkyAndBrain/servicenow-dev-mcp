---
name: servicenow-mcp-doc-review
description: Thoroughly review ServiceNow documentation against this MCP server to find coverage gaps and improvements. Use when the user wants to audit tool coverage, discover missing APIs/modules/tools, check for deprecated ServiceNow patterns, find new platform features to expose, or produce a prioritized improvement plan for the MCP.
user-invocable: true
argument-hint: [optional: focus a module/API area, e.g. "Table API", "CMDB", or leave blank for a full audit]
---

# ServiceNow MCP Documentation Review & Improvement Auditor

You audit this ServiceNow MCP server against **three sources of truth** and produce a
prioritized, actionable improvement report. Optionally, you then implement the top items.

The three sources you reconcile:

1. **The code** — what tools/modules the MCP actually ships today (ground truth of coverage).
2. **The live instance** — what plugins, tables, and APIs are actually available to hit.
3. **ServiceNow documentation** — what the platform *can* do (REST APIs, module capabilities,
   new features, deprecations) that the MCP could expose but may not.

A gap only matters if it exists in the docs/instance **and** is missing/weak in the code.
Never recommend adding a tool for an API the instance doesn't have, or that already exists.

---

## Baseline: what the MCP ships today

The current inventory (confirm before every audit — do not trust these numbers blind):

Tool modules live in `src/tools/<servicenow-module>/*.ts` (folders named after ServiceNow product modules — `it-service-management/`, `now-platform/`, etc.), so all inventory commands recurse.

```bash
echo "Modules (files): $(find src/tools -name '*.ts' | wc -l | tr -d ' ')"
echo "Module folders:  $(find src/tools -mindepth 1 -type d | wc -l | tr -d ' ')"
echo "Tools:           $(grep -rho 'server.tool(' src/tools | wc -l | tr -d ' ')"
echo "--- tools per module folder ---"
for d in src/tools/*/; do printf '%3d  %s\n' "$(grep -rho 'server.tool(' "$d" | wc -l | tr -d ' ')" "$(basename "$d")"; done | sort -rn
```

To see every tool name + its one-line description (this is your coverage map):

```bash
grep -rhoE 'server\.tool\(\s*"[^"]+",\s*"[^"]+"' src/tools \
  | sed -E 's/server\.tool\(\s*//' | sort
# If tool name and description sit on separate lines, fall back to:
grep -rhoE '"sn_[a-z0-9_]+"' src/tools | sort -u
```

Registration lives in `src/index.ts` (the `registrars` array). A new module is only live
once it is imported and added there. Client capabilities are in `src/client.ts`
(`query`, `getById`, `create`, `update`, `delete`, `aggregate`, `restApi`,
`executeBackgroundScript`) — an improvement is cheap if the client already supports it.

---

## Step 1 — Establish instance ground truth

The instance is the arbiter of what's *possible* to add. Load credentials and probe it.

```bash
source .env 2>/dev/null || true
INSTANCE="$SERVICENOW_INSTANCE_URL"
AUTH="$SERVICENOW_USERNAME:$SERVICENOW_PASSWORD"

# Instance version / build (determines which docs release applies — Zurich, Yokohama, etc.)
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_properties?sysparm_query=nameINglide.buildname,glide.war,glide.product.description&sysparm_fields=name,value" | jq '.result'

# Active plugins (what modules the instance actually has — gates what tools make sense)
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/v_plugin?sysparm_query=active=true&sysparm_fields=id,name&sysparm_limit=1000" | jq -r '.result[] | "\(.id)  \(.name)"' | sort

# Available scoped apps (candidate namespaces for whole new tool modules)
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_scope?sysparm_query=active=true&sysparm_fields=scope,name&sysparm_limit=1000" | jq -r '.result[] | "\(.scope)  \(.name)"' | sort

# Inbound REST APIs registered on the instance (scripted/table/import APIs the MCP could call)
curl -s -u "$AUTH" -H "Accept: application/json" \
  "$INSTANCE/api/now/table/sys_ws_definition?sysparm_fields=name,base_uri&sysparm_limit=500" | jq -r '.result[] | "\(.name)  \(.base_uri)"' | sort
```

Record: **instance version** (pick the matching docs release), **active plugins**, and any
scoped apps that have **no corresponding tool module**.

---

## Step 2 — Review ServiceNow documentation

**Primary source — local docs (offline, authoritative, no rate limits):**
A full clone of the official ServiceNow AI Platform docs lives at
`/Users/sukhmal/code/ServiceNow/ServiceNowDocs`. Prefer this over the web.

```bash
DOCS=/Users/sukhmal/code/ServiceNow/ServiceNowDocs
ls "$DOCS/markdown"                       # module taxonomy (matches our tool folders)
cat "$DOCS/llms.txt"                      # AI-oriented index of the whole doc set
cat "$DOCS/README.md" | grep -i release   # which release family this clone is (e.g. Australia)

# REST API reference — the master checklist for API coverage
ls "$DOCS/markdown/api-reference"
grep -rl -i 'rest api' "$DOCS/markdown/api-reference" | head

# Per-module capabilities — the folder names map 1:1 to our src/tools folders
ls "$DOCS/markdown/it-service-management"      # ITSM
ls "$DOCS/markdown/servicenow-platform"        # CMDB, Knowledge, core platform
ls "$DOCS/markdown/source-to-pay-operations"   # S2P
# Release deltas (new/changed capabilities) — candidate additions/deprecations
ls "$DOCS/markdown" | grep '^delta-'
```

Start from `llms.txt` — it is ServiceNow's own AI index: it lists every publication (folder)
with a link, states the release **family** (the clone tracks the latest, currently
**"australia"**, post-Zurich), and notes each publication has an `index.md` listing its files.
The `markdown/` publication names map to this MCP's `src/tools/` module folders — audit a
module by diffing its doc publication against its tool folder.

**Fallback — web.** Per `llms.txt`: **do NOT fetch `servicenow.com/docs`** — it is a
JavaScript SPA and returns no readable content to LLMs (this is why direct doc fetches fail).
Instead fetch the raw markdown of another release family with `WebFetch`:
`https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/{branch}/markdown/{publication}/{file}`
(branch = `australia` | `zurich` | `yokohama` | `xanadu`; start at `.../{publication}/index.md`).
Use `WebSearch` only to discover topic names, then fetch the raw markdown. Anchor to the
instance's release (Step 1); check `$DOCS/README.md` / `llms.txt` for the clone's family.

Suggested searches (adapt to the focus argument if one was given):

- `ServiceNow REST API list <release>` — enumerate all Now Platform APIs.
- `ServiceNow <release> release notes new features` — new capabilities to expose.
- `ServiceNow <release> deprecations` — patterns to migrate away from.
- Per module the MCP covers: `ServiceNow <module> REST API` — check for dedicated APIs the
  MCP currently fakes with raw table queries (a dedicated API is usually a better tool).

Build a **documented-capability list**: each item = `{ area, capability, API/table, release, source URL }`.

---

## Step 3 — Cross-reference: find the gaps

Reconcile the three lists. For every documented capability, classify it:

| Verdict | Meaning | Action |
|---------|---------|--------|
| **Covered** | A tool already does this well | none |
| **Missing module** | Whole area with no module, plugin active on instance | propose new module |
| **Missing tool** | Module exists but lacks this action | propose new tool |
| **Weak tool** | Tool exists but misses key params/fields/filters or returns too much/little | propose enhancement |
| **Better API available** | Tool uses raw table query where a dedicated Now API exists | propose refactor |
| **Deprecated** | Tool relies on a deprecated table/API/pattern | propose migration |
| **N/A** | Docs describe it but instance plugin is inactive | note, don't recommend |

Concrete gap-hunting checks:

```bash
# Which active-plugin scopes have NO matching tool module?
# (Compare Step-1 scope list against the src/tools/<module> folders by hand or with comm.)

# Does a "get" tool fetch related records, or leave the user to chase them?
grep -rL 'Promise.all' src/tools --include='*.ts'   # modules with no parallel related-record fetch

# Which tools expose paging/filtering vs. hard-coded limits?
grep -rLn 'sysparm_offset|offset' src/tools --include='*.ts'   # tools missing pagination

# Read-only-only modules (no develop-mode write tools) — is that intentional?
grep -rL 'mode !== "develop"' src/tools --include='*.ts'
```

For each candidate gap, **verify against the live instance** before recommending it (Step-1
probes on the specific table/API). A recommendation grounded in an actual instance response is
worth ten that are guessed from docs.

---

## Step 4 — Produce the improvement report

Output a single prioritized report. Do **not** start editing code until the user picks items.

Structure:

```
## ServiceNow MCP — Documentation Review (<instance release>, <date>)

### Summary
- Modules: N   Tools: M   Instance: <release/build>
- X gaps found: A missing modules, B missing tools, C enhancements, D deprecations

### Prioritized recommendations
| # | Priority | Type | Area | Recommendation | Why it matters | Effort |
|---|----------|------|------|----------------|----------------|--------|
| 1 | High | Missing tool | CMDB | Add sn_cmdb_identify (Identification & Reconciliation API) | ... | S |
...

### Detail (per recommendation)
- **What**: the tool(s)/change proposed, with exact API/table and key params
- **Evidence**: doc URL + live-instance probe result confirming it applies
- **Sketch**: tool name(s), signature, which module/file, whether it needs a client change
```

Prioritize by: (1) user impact / frequency of the workflow, (2) whether the instance actually
has the plugin, (3) effort (S/M/L). Flag deprecations as High regardless of effort — they
break silently on upgrade.

**Honesty rules:** if a probe failed or a plugin was inactive, say so — don't imply coverage
you couldn't confirm. If you sampled rather than enumerated (e.g. checked 10 of 40 APIs), state
what you skipped. A silent cap reads as "reviewed everything" when it wasn't.

---

## Step 5 — (Optional) Implement approved improvements

Only after the user approves specific items. Follow the project's exact conventions
(see `CLAUDE.md` and the `servicenow-sourcing-procurement` skill for the full tool pattern).

Per approved item:

1. **Confirm the schema live** — `sys_dictionary` for the table, check inheritance
   (`sys_db_object.super_class`); inherited columns won't show on the child.
2. **Write/extend the module** using the standard pattern: read-only tools for both modes,
   `if (mode !== "develop") return;` guard before write tools, `jsonResult`/`errorResult`,
   `sysparm_display_value: "true"` for reference/choice fields, `z.coerce.number()` for
   numeric params (MCP clients send strings), pagination via `limit`/`offset`.
3. **Register** the module in `src/index.ts` (import + `registrars` array) if it's new.
4. **Build**: `npm run build` — TypeScript catches most issues. Do a clean build
   (`rm -rf dist && npm run build`) if modules were renamed/removed.
5. **Test live**: `SERVICENOW_ENV_FILE=.env npx @modelcontextprotocol/inspector node dist/index.js`.
6. **Update docs before committing** — per the user's standing rule, update `README.md`
   (the module/tool count tables), `CLAUDE.md` (the "N tools across M modules" line and
   version), and `package.json` version/description. Verify counts with the Step-1 script.

Commit only when the user asks.

---

## Scope control

- If the argument names a focus area (e.g. "CMDB", "Table API"), audit **only** that area but
  still run Step 1 to ground it, and still check the whole `src/tools` list so you don't
  duplicate an existing tool.
- A full audit is large. If the token budget is tight, do it module-by-module and report
  incrementally rather than silently truncating.
- Never recommend removing a tool without confirming (via the instance) that its
  table/API is actually gone or deprecated — some tools intentionally cover legacy plugins.
