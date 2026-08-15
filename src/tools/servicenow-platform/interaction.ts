import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

// Interaction Management — the omni-channel interaction record (chat, phone,
// walk-up, messaging) that can spawn/relate to tasks.
export function registerInteractionTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_interaction_list",
    "List interactions (interaction) — omni-channel contacts (chat, phone, walk-up, messaging). Filter by state, channel type, assignee, or requester.",
    {
      state: z.string().optional().describe("Filter by state (e.g. 'new', 'work_in_progress', 'closed_complete')"),
      type: z.string().optional().describe("Filter by interaction type/channel (e.g. 'chat', 'phone', 'walkup')"),
      assigned_to: z.string().optional().describe("Filter by assigned_to user sys_id"),
      opened_for: z.string().optional().describe("Filter by opened_for user sys_id (the person contacting)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, type, assigned_to, opened_for, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (state) queryParts.push(`state=${state}`);
        if (type) queryParts.push(`type=${type}`);
        if (assigned_to) queryParts.push(`assigned_to=${assigned_to}`);
        if (opened_for) queryParts.push(`opened_for=${opened_for}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCopened_at");
        const result = await client.query("interaction", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,state,short_description,type,channel_metadata_table,opened_for,assigned_to,assignment_group,opened_at,closed_at,sys_created_on",
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
    "sn_interaction_get",
    "Get an interaction (interaction) by sys_id along with its related records (interaction_related_record) — the tasks and knowledge articles linked to it.",
    {
      sys_id: z.string().describe("The sys_id of the interaction"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [interaction, related] = await Promise.all([
          client.getById("interaction", sys_id),
          client.query("interaction_related_record", {
            sysparm_query: `interaction=${sys_id}`,
            sysparm_fields: "sys_id,document_table,document_id,task,knowledge_article,type,operation",
            sysparm_limit: 100,
            sysparm_display_value: "true",
          }),
        ]);
        return jsonResult({ interaction, relatedRecords: related.records, relatedCount: related.totalCount });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
