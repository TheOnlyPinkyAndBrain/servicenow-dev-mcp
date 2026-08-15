import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult, textResult } from "../../utils.js";
import { EXECUTE } from "../../annotations.js";

export function registerExecuteTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  if (mode !== "develop") return;

  server.tool(
    "sn_script_execute",
    "Execute a server-side script on the ServiceNow instance using the native Background Scripts engine (sys.scripts.do). Has full access to GlideRecord, GlideSystem (gs), GlideAggregate, GlideDateTime, and all server-side APIs. Use gs.print() to produce output. Exactly like running a script in the Background Scripts UI.",
    {
      script: z
        .string()
        .describe(
          "Server-side JavaScript to execute. Use gs.print() to output results. " +
          "Has access to all server-side APIs: GlideRecord, gs, GlideAggregate, GlideDateTime, etc."
        ),
      scope: z
        .string()
        .optional()
        .describe("Application scope to run the script in (default 'global')"),
    },
    EXECUTE,
    async ({ script, scope }) => {
      try {
        const result = await client.executeBackgroundScript(script, scope ?? "global");

        if (!result.success) {
          return errorResult(new Error(result.error ?? "Script execution failed"));
        }

        if (!result.output) {
          return textResult("Script executed successfully (no output).");
        }

        // Try to parse as JSON for pretty output
        try {
          const parsed = JSON.parse(result.output);
          return jsonResult(parsed);
        } catch {
          // Not JSON — return as plain text
        }

        return textResult(result.output);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_script_execute_query",
    "Execute a GlideRecord query via Background Scripts and return results as JSON. A convenience wrapper that builds the boilerplate for you — just specify table, query, and fields.",
    {
      table: z.string().describe("Table to query, e.g. 'incident'"),
      query: z.string().optional().describe("Encoded query string, e.g. 'active=true^priority=1'"),
      fields: z
        .array(z.string())
        .describe("Fields to return, e.g. ['number', 'short_description', 'state']"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      order_by: z.string().optional().describe("Field to order by"),
      order_dir: z.enum(["asc", "desc"]).optional().describe("Order direction (default 'asc')"),
      display_value: z.boolean().optional().describe("Return display values instead of internal values (default true)"),
    },
    EXECUTE,
    async ({ table, query, fields, limit, order_by, order_dir, display_value }) => {
      try {
        const maxRows = limit ?? 20;
        const useDisplay = display_value !== false;
        const escapedQuery = query ? query.replace(/\\/g, "\\\\").replace(/'/g, "\\'") : "";

        const fieldLines = fields
          .map((f) => {
            const escaped = f.replace(/'/g, "\\'");
            if (useDisplay) {
              return `  row['${escaped}'] = gr.getDisplayValue('${escaped}') || gr.getValue('${escaped}') || '';`;
            }
            return `  row['${escaped}'] = gr.getValue('${escaped}') || '';`;
          })
          .join("\n");

        const script = [
          `var gr = new GlideRecord('${table.replace(/'/g, "\\'")}');`,
          escapedQuery ? `gr.addEncodedQuery('${escapedQuery}');` : "",
          order_by
            ? order_dir === "desc"
              ? `gr.orderByDesc('${order_by.replace(/'/g, "\\'")}');`
              : `gr.orderBy('${order_by.replace(/'/g, "\\'")}');`
            : "",
          `gr.setLimit(${maxRows});`,
          "gr.query();",
          "var results = [];",
          "while (gr.next()) {",
          "  var row = {};",
          fieldLines,
          "  results.push(row);",
          "}",
          `gs.print(JSON.stringify({ count: results.length, records: results }, null, 2));`,
        ]
          .filter(Boolean)
          .join("\n");

        const result = await client.executeBackgroundScript(script);

        if (!result.success) {
          return errorResult(new Error(result.error ?? "Query execution failed"));
        }

        if (result.output) {
          try {
            return jsonResult(JSON.parse(result.output));
          } catch {
            return textResult(result.output);
          }
        }

        return jsonResult({ count: 0, records: [] });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
