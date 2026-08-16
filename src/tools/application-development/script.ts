import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import { ServiceNowApiError } from "../../client.js";
import type { Mode } from "../../types.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

const SCRIPT_TYPES = {
  business_rule: "sys_script",
  script_include: "sys_script_include",
  client_script: "sys_script_client",
  fix_script: "sys_script_fix",
  email_script: "sys_script_email",
} as const;

type ScriptType = keyof typeof SCRIPT_TYPES;

const scriptTypeEnum = z.enum([
  "business_rule",
  "script_include",
  "client_script",
  "fix_script",
  "email_script",
]);

function errorResult(error: unknown) {
  const message =
    error instanceof ServiceNowApiError
      ? `ServiceNow API Error (${error.statusCode}): ${error.detail}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

// Metadata-only fields per script type (excludes the script body for list operations)
const LIST_FIELDS: Record<ScriptType, string> = {
  business_rule:
    "sys_id,name,table,active,when,order,sys_updated_on,sys_updated_by",
  script_include:
    "sys_id,name,api_name,active,client_callable,sys_updated_on,sys_updated_by",
  client_script:
    "sys_id,name,table,active,type,ui_type,sys_updated_on,sys_updated_by",
  fix_script:
    "sys_id,name,active,sys_updated_on,sys_updated_by",
  email_script:
    "sys_id,name,sys_updated_on,sys_updated_by",
};

export function registerScriptTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  // sn_script_list — Both modes
  server.tool(
    "sn_script_list",
    "List scripts by type (business_rule, script_include, client_script, fix_script) — metadata only, no script body",
    {
      type: scriptTypeEnum.describe("Script type to list"),
      table: z
        .string()
        .optional()
        .describe("Filter by table name (for business rules and client scripts)"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ type, table, active, query, limit, offset }) => {
      try {
        const tableName = SCRIPT_TYPES[type];
        const queryParts: string[] = [];
        if (table) queryParts.push(`table=${table}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");

        const result = await client.query(tableName, {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: LIST_FIELDS[type],
          sysparm_limit: limit,
          sysparm_offset: offset,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  scriptType: type,
                  totalCount: result.totalCount,
                  count: result.records.length,
                  records: result.records,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_script_get — Both modes
  server.tool(
    "sn_script_get",
    "Get full script details including source code by sys_id",
    {
      type: scriptTypeEnum.describe("Script type"),
      sys_id: z.string().describe("The sys_id of the script record"),
    },
    READ,
    async ({ type, sys_id }) => {
      try {
        const tableName = SCRIPT_TYPES[type];
        const record = await client.getById(tableName, sys_id);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_script_search — Both modes
  server.tool(
    "sn_script_search",
    "Search scripts by name or body text content",
    {
      type: scriptTypeEnum.describe("Script type to search"),
      search_text: z
        .string()
        .describe("Text to search for in script name or body"),
      table: z.string().optional().describe("Filter by table name"),
      limit: z.coerce.number().min(1).max(50).optional().describe("Max records (default 10)"),
    },
    READ,
    async ({ type, search_text, table, limit }) => {
      try {
        const tableName = SCRIPT_TYPES[type];
        const queryParts: string[] = [];
        queryParts.push(`nameLIKE${search_text}^ORscriptLIKE${search_text}`);
        if (table) queryParts.push(`table=${table}`);
        queryParts.push("ORDERBYname");

        const result = await client.query(tableName, {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: LIST_FIELDS[type] + ",script",
          sysparm_limit: limit ?? 10,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  scriptType: type,
                  searchText: search_text,
                  totalCount: result.totalCount,
                  count: result.records.length,
                  records: result.records,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  // sn_script_create — Develop only
  server.tool(
    "sn_script_create",
    "Create a new script record (business rule, script include, client script, or fix script)",
    {
      type: scriptTypeEnum.describe("Script type to create"),
      data: z
        .record(z.string(), z.unknown())
        .describe(
          "Field-value pairs for the script (must include 'name' and 'script' at minimum)"
        ),
    },
    CREATE,
    async ({ type, data }) => {
      try {
        const tableName = SCRIPT_TYPES[type];
        const record = await client.create(tableName, data);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // sn_script_update — Develop only
  server.tool(
    "sn_script_update",
    "Update an existing script record",
    {
      type: scriptTypeEnum.describe("Script type"),
      sys_id: z.string().describe("The sys_id of the script to update"),
      data: z
        .record(z.string(), z.unknown())
        .describe("Field-value pairs to update"),
    },
    UPDATE,
    async ({ type, sys_id, data }) => {
      try {
        const tableName = SCRIPT_TYPES[type];
        const record = await client.update(tableName, sys_id, data);
        return {
          content: [{ type: "text", text: JSON.stringify(record, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
