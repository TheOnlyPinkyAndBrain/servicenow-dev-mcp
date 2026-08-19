import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

export function registerDecisionTableTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_decision_table_list",
    "List Decision Tables (sys_decision) — reusable if/then rule sets (inputs -> conditions -> an answer) commonly referenced from Flow Designer flows and business rules instead of hardcoding branching logic.",
    {
      active: z.boolean().optional().describe("Filter by active status"),
      status: z.string().optional().describe("Filter by publication status (e.g. 'draft', 'published')"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ active, status, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (status) queryParts.push(`status=${status}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");

        const result = await client.query("sys_decision", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,short_description,active,status,answer_table,answer_type,sys_scope,sys_updated_on",
          sysparm_limit: limit,
          sysparm_offset: offset,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_decision_table_get",
    "Get a Decision Table's definition together with its inputs (sys_decision_input) and rule rows (sys_decision_question, each a condition -> answer pair evaluated in order).",
    {
      sys_id: z.string().describe("Decision table sys_id (sys_decision)"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [table, inputs, rows] = await Promise.all([
          client.getById("sys_decision", sys_id),
          client.query("sys_decision_input", {
            sysparm_query: `model=${sys_id}`,
            sysparm_fields: "sys_id,name,label,type,mandatory,order",
            sysparm_limit: 50,
            sysparm_display_value: "true",
          }),
          client.query("sys_decision_question", {
            sysparm_query: `decision_table=${sys_id}^ORDERBYorder`,
            sysparm_fields: "sys_id,condition,answer,default_answer,order,active",
            sysparm_limit: 200,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          table,
          inputs: inputs.records,
          inputCount: inputs.totalCount,
          rows: rows.records,
          rowCount: rows.totalCount,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  if (mode !== "develop") return;

  server.tool(
    "sn_decision_table_create",
    "Create a new Decision Table (sys_decision) container. Note: this creates the table definition itself, not its inputs or rule rows — those are typically added via the Decision Builder UI after the shell exists, since input variable types and row conditions are validated interactively against each other.",
    {
      name: z.string().describe("Decision table name"),
      short_description: z.string().optional().describe("Description"),
      answer_table: z.string().optional().describe("Table that stores possible answers (for reference-type answers)"),
      answer_type: z.string().optional().describe("How answers are returned, e.g. 'reference', 'string'"),
      active: z.boolean().optional().describe("Active status (default true)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional field values"),
    },
    CREATE,
    async ({ name, short_description, answer_table, answer_type, active, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { name, ...additional_fields };
        if (short_description) body.short_description = short_description;
        if (answer_table) body.answer_table = answer_table;
        if (answer_type) body.answer_type = answer_type;
        if (active !== undefined) body.active = active;

        const result = await client.create("sys_decision", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_decision_table_update",
    "Update a Decision Table's definition (sys_decision) — name, description, status, active state. To modify inputs or rule rows, use sn_table_update against sys_decision_input / sys_decision_question directly.",
    {
      sys_id: z.string().describe("sys_id of the decision table to update"),
      fields: z.record(z.string(), z.unknown()).describe("Field values to update (e.g. name, short_description, active, status)"),
    },
    UPDATE,
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("sys_decision", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
