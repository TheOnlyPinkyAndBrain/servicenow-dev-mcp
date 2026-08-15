import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { READ } from "../../annotations.js";

export function registerIntegrationTools(
  server: McpServer,
  client: ServiceNowClient,
  _mode: Mode
): void {
  server.tool(
    "sn_rest_message_list",
    "List REST message definitions (sys_rest_message) — outbound REST integration configurations",
    {
      name: z.string().optional().describe("Message name (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const result = await client.query("sys_rest_message", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,rest_endpoint,authentication_type,use_mid_server,active,sys_scope,sys_updated_on",
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
    "sn_rest_message_fn_list",
    "List HTTP methods for a REST message (sys_rest_message_fn) — GET, POST, PUT, etc.",
    {
      rest_message: z.string().describe("REST message sys_id"),
    },
    READ,
    async ({ rest_message }) => {
      try {
        const result = await client.query("sys_rest_message_fn", {
          sysparm_query: `rest_message=${rest_message}^ORDERBYhttp_method`,
          sysparm_fields: "sys_id,function_name,http_method,rest_endpoint,content,authentication_type,use_mid_server",
          sysparm_limit: 50,
          sysparm_display_value: "true",
        });
        return jsonResult({ count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_ecc_queue_list",
    "List ECC Queue records (ecc_queue) — external communication channel for MID server. Shows stuck, errored, or processing records.",
    {
      state: z.enum(["ready", "processing", "processed", "error"]).optional().describe("Queue state"),
      queue: z.enum(["input", "output"]).optional().describe("Queue direction"),
      topic: z.string().optional().describe("Topic filter (contains match)"),
      agent: z.string().optional().describe("Agent/MID server name"),
      created_after: z.string().optional().describe("Created after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ state, queue, topic, agent, created_after, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (state) qp.push(`state=${state}`);
        if (queue) qp.push(`queue=${queue}`);
        if (topic) qp.push(`topicLIKE${topic}`);
        if (agent) qp.push(`agentLIKE${agent}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("ecc_queue", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,state,queue,topic,agent,source,error_string,agent_correlator,sys_created_on,sys_updated_on",
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
    "sn_ecc_queue_stuck",
    "Find stuck ECC Queue records — items processing for too long, indicating MID server issues",
    {
      min_minutes: z.coerce.number().optional().describe("Minimum minutes in processing state (default 15)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ min_minutes, limit, offset }) => {
      try {
        const cutoff = new Date(Date.now() - (min_minutes ?? 15) * 60000).toISOString().replace("T", " ").slice(0, 19);

        const result = await client.query("ecc_queue", {
          sysparm_query: `state=processing^sys_updated_on<=${cutoff}^ORDERBYsys_updated_on`,
          sysparm_fields: "sys_id,name,state,queue,topic,agent,source,error_string,sys_created_on,sys_updated_on",
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
    "sn_mid_server_list",
    "List MID Server agents (ecc_agent) — status, version, host info",
    {
      status: z.string().optional().describe("Status filter (Up, Down)"),
      name: z.string().optional().describe("MID server name (contains match)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ status, name, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (status) qp.push(`status=${status}`);
        if (name) qp.push(`nameLIKE${name}`);
        qp.push("ORDERBYname");

        const result = await client.query("ecc_agent", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,status,host_name,version,validated,user_name,mid_java_version,router,sys_updated_on",
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
    "sn_rest_transaction_log",
    "Query REST API transaction logs — inbound REST calls to this instance",
    {
      url: z.string().optional().describe("URL path (contains match)"),
      status: z.string().optional().describe("HTTP status code"),
      http_method: z.string().optional().describe("HTTP method (GET, POST, PUT, PATCH, DELETE)"),
      created_after: z.string().optional().describe("Created after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ url, status, http_method, created_after, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (url) qp.push(`urlLIKE${url}`);
        if (status) qp.push(`status=${status}`);
        if (http_method) qp.push(`http_method=${http_method}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_rest_transaction_log", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,url,http_method,status,response_time,request_body,response_body,sys_created_on,sys_created_by",
          sysparm_limit: limit,
          sysparm_offset: offset,
        });
        return jsonResult({ totalCount: result.totalCount, count: result.records.length, records: result.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_integration_hub_log",
    "Query Integration Hub execution logs for flow actions and spokes",
    {
      flow: z.string().optional().describe("Flow name (contains match)"),
      action: z.string().optional().describe("Action name (contains match)"),
      status: z.string().optional().describe("Execution status"),
      created_after: z.string().optional().describe("Created after datetime"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ flow, action, status, created_after, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (flow) qp.push(`flow.nameLIKE${flow}`);
        if (action) qp.push(`action.nameLIKE${action}`);
        if (status) qp.push(`status=${status}`);
        if (created_after) qp.push(`sys_created_on>=${created_after}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_hub_action_instance", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,flow,action,status,started,ended,error_message,sys_created_on",
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
    "sn_soap_message_list",
    "List outbound SOAP messages (sys_soap_message) — configured SOAP web-service integrations, with their WSDL and authentication type.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");
        const result = await client.query("sys_soap_message", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,description,wsdl,authentication_type,access,sys_updated_on",
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
    "sn_web_service_list",
    "List inbound SOAP web services (sys_web_service) — scripted SOAP endpoints exposed by the instance.",
    {
      name: z.string().optional().describe("Filter by name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (name) queryParts.push(`nameLIKE${name}`);
        if (active !== undefined) queryParts.push(`active=${active}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYname");
        const result = await client.query("sys_web_service", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,name,function_name,short_description,active,sys_updated_on",
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
}
