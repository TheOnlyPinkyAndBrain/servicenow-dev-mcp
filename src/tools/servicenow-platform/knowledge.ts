import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

export function registerKnowledgeTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_knowledge_search",
    "Search knowledge base articles using the Knowledge API (sn_km_api). Returns matching articles with relevance ranking.",
    {
      query: z.string().describe("Search query text"),
      knowledge_base: z.string().optional().describe("Knowledge base sys_id to search within"),
      category: z.string().optional().describe("Category sys_id to filter"),
      limit: z.coerce.number().min(1).max(50).optional().describe("Max results (default 10)"),
    },
    READ,
    async ({ query, knowledge_base, category, limit }) => {
      try {
        const params = new URLSearchParams();
        params.set("query", query);
        if (knowledge_base) params.set("kb", knowledge_base);
        if (category) params.set("category", category);
        params.set("limit", String(limit ?? 10));
        params.set("fields", "short_description,sys_class_name,number,kb_knowledge_base,kb_category,workflow_state,sys_view_count");

        const result = await client.restApi("GET", `/api/sn_km_api/knowledge/articles?${params.toString()}`);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_knowledge_article_get",
    "Get a knowledge article by sys_id including full content",
    {
      sys_id: z.string().describe("Article sys_id"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const result = await client.restApi("GET", `/api/sn_km_api/knowledge/articles/${sys_id}`);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_knowledge_base_list",
    "List knowledge bases",
    {
      active: z.boolean().optional().describe("Filter by active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ active, limit }) => {
      try {
        const qp: string[] = [];
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYtitle");

        const result = await client.query("kb_knowledge_base", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,title,description,owner,active,kb_version,sys_updated_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_knowledge_category_list",
    "List knowledge categories for a knowledge base",
    {
      knowledge_base: z.string().optional().describe("Knowledge base sys_id"),
      parent_category: z.string().optional().describe("Parent category sys_id (for subcategories)"),
      active: z.boolean().optional().describe("Filter by active (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
    },
    READ,
    async ({ knowledge_base, parent_category, active, limit }) => {
      try {
        const qp: string[] = [];
        if (knowledge_base) qp.push(`kb_knowledge_base=${knowledge_base}`);
        if (parent_category) qp.push(`parent_id=${parent_category}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYlabel");

        const result = await client.query("kb_category", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,label,full_category,kb_knowledge_base,parent_id,active,sys_updated_on",
          sysparm_limit: limit ?? 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_knowledge_article_list",
    "List knowledge articles with filters using the Table API for advanced queries",
    {
      knowledge_base: z.string().optional().describe("Knowledge base sys_id"),
      category: z.string().optional().describe("Category sys_id"),
      workflow_state: z.enum(["draft", "review", "published", "retired"]).optional().describe("Workflow state"),
      author: z.string().optional().describe("Author name (contains match)"),
      text_search: z.string().optional().describe("Search in short_description or text"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ knowledge_base, category, workflow_state, author, text_search, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (knowledge_base) qp.push(`kb_knowledge_base=${knowledge_base}`);
        if (category) qp.push(`kb_category=${category}`);
        if (workflow_state) qp.push(`workflow_state=${workflow_state}`);
        if (author) qp.push(`author.nameLIKE${author}`);
        if (text_search) qp.push(`short_descriptionLIKE${text_search}^ORtextLIKE${text_search}`);
        qp.push("ORDERBYDESCsys_view_count");

        const result = await client.query("kb_knowledge", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,kb_knowledge_base,kb_category,workflow_state,author,sys_view_count,rating,valid_to,sys_updated_on",
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
    "sn_knowledge_feedback",
    "List feedback for a knowledge article",
    {
      article_sys_id: z.string().describe("Knowledge article sys_id"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ article_sys_id, limit }) => {
      try {
        const result = await client.query("kb_feedback", {
          sysparm_query: `article=${article_sys_id}^ORDERBYDESCsys_created_on`,
          sysparm_fields: "sys_id,article,rating,comments,useful,flagged,user,sys_created_on",
          sysparm_limit: limit,
          sysparm_display_value: "true",
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_knowledge_article_versions",
    "List version history for a knowledge article (kb_version). Shows each captured version of an article as it was published/updated over time.",
    {
      article: z.string().optional().describe("Filter by the article sys_id (the kb_version.knowledge reference)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ article, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (article) queryParts.push(`knowledge=${article}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_created_on");
        const result = await client.query("kb_version", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,knowledge,version,modified_by,modified_on,sys_created_on,sys_created_by",
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
    "sn_knowledge_block_list",
    "List Knowledge Blocks (kb_knowledge_block) — reusable content blocks embedded across articles. Requires the Knowledge Blocks plugin (com.snc.knowledge_blocks).",
    {
      short_description: z.string().optional().describe("Filter by short description (contains match)"),
      kb_knowledge_base: z.string().optional().describe("Filter by knowledge base sys_id"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ short_description, kb_knowledge_base, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (short_description) queryParts.push(`short_descriptionLIKE${short_description}`);
        if (kb_knowledge_base) queryParts.push(`kb_knowledge_base=${kb_knowledge_base}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYDESCsys_updated_on");
        const result = await client.query("kb_knowledge_block", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,number,short_description,kb_knowledge_base,workflow_state,sys_updated_on",
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

  if (mode !== "develop") return;

  server.tool(
    "sn_knowledge_article_create",
    "Create a knowledge article",
    {
      short_description: z.string().describe("Article title/short description"),
      text: z.string().describe("Article body content (HTML supported)"),
      kb_knowledge_base: z.string().describe("Knowledge base sys_id"),
      kb_category: z.string().optional().describe("Category sys_id"),
      workflow_state: z.enum(["draft", "review", "published"]).optional().describe("Workflow state (default draft)"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    CREATE,
    async ({ short_description, text, kb_knowledge_base, kb_category, workflow_state, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, text, kb_knowledge_base, ...additional_fields };
        if (kb_category) body.kb_category = kb_category;
        if (workflow_state) body.workflow_state = workflow_state;
        const result = await client.create("kb_knowledge", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_knowledge_article_update",
    "Update a knowledge article",
    {
      sys_id: z.string().describe("Article sys_id"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    UPDATE,
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("kb_knowledge", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
