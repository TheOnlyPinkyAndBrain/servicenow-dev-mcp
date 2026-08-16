import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { CREATE, READ, UPDATE } from "../../annotations.js";

export function registerCsmTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_csm_case_list",
    "List Customer Service Management cases (sn_customerservice_case)",
    {
      priority: z.enum(["1", "2", "3", "4"]).optional().describe("Priority: 1=Critical, 2=High, 3=Moderate, 4=Low"),
      state: z.string().optional().describe("State value"),
      account: z.string().optional().describe("Customer account name (contains match)"),
      contact: z.string().optional().describe("Contact name (contains match)"),
      product: z.string().optional().describe("Product name (contains match)"),
      assignment_group: z.string().optional().describe("Assignment group name (contains match)"),
      active: z.boolean().optional().describe("Filter by active status"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ priority, state, account, contact, product, assignment_group, active, query, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (priority) qp.push(`priority=${priority}`);
        if (state) qp.push(`state=${state}`);
        if (account) qp.push(`account.nameLIKE${account}`);
        if (contact) qp.push(`contact.nameLIKE${contact}`);
        if (product) qp.push(`product.nameLIKE${product}`);
        if (assignment_group) qp.push(`assignment_group.nameLIKE${assignment_group}`);
        if (active !== undefined) qp.push(`active=${active}`);
        if (query) qp.push(query);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sn_customerservice_case", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,number,short_description,priority,state,account,contact,product,assignment_group,assigned_to,opened_at,resolved_at,active,sys_updated_on",
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
    "sn_csm_case_get",
    "Get full CSM case details including tasks and communications",
    {
      sys_id: z.string().describe("Case sys_id"),
    },
    READ,
    async ({ sys_id }) => {
      try {
        const [caseRecord, caseTasks, communications] = await Promise.all([
          client.getById("sn_customerservice_case", sys_id),
          client.query("sn_customerservice_task", {
            sysparm_query: `case=${sys_id}`,
            sysparm_fields: "sys_id,number,short_description,state,assignment_group,assigned_to",
            sysparm_display_value: "true",
            sysparm_limit: 20,
          }),
          client.query("sys_journal_field", {
            sysparm_query: `element_id=${sys_id}^elementINwork_notes,comments^ORDERBYDESCsys_created_on`,
            sysparm_fields: "sys_id,element,value,sys_created_on,sys_created_by",
            sysparm_limit: 20,
          }),
        ]);
        return jsonResult({ case: caseRecord, caseTasks: caseTasks.records, communications: communications.records });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_csm_account_list",
    "List customer accounts",
    {
      name: z.string().optional().describe("Account name (contains match)"),
      account_code: z.string().optional().describe("Account code"),
      active: z.boolean().optional().describe("Active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ name, account_code, active, limit }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (account_code) qp.push(`account_code=${account_code}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYname");

        const result = await client.query("customer_account", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,account_code,customer,vendor,partner,primary_contact,phone,city,state,country,active,sys_updated_on",
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
    "sn_csm_contact_list",
    "List customer contacts",
    {
      account: z.string().optional().describe("Account name (contains match)"),
      name: z.string().optional().describe("Contact name (contains match)"),
      email: z.string().optional().describe("Email (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
    },
    READ,
    async ({ account, name, email, active, limit }) => {
      try {
        const qp: string[] = [];
        if (account) qp.push(`account.nameLIKE${account}`);
        if (name) qp.push(`nameLIKE${name}`);
        if (email) qp.push(`emailLIKE${email}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const result = await client.query("customer_contact", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,email,phone,account,title,active,sys_updated_on",
          sysparm_limit: limit,
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
    "sn_csm_case_create",
    "Create a CSM case using the Customer Service API",
    {
      short_description: z.string().describe("Short description"),
      account: z.string().optional().describe("Account sys_id"),
      contact: z.string().optional().describe("Contact sys_id"),
      priority: z.enum(["1", "2", "3", "4"]).optional().describe("Priority"),
      product: z.string().optional().describe("Product sys_id"),
      assignment_group: z.string().optional().describe("Assignment group sys_id"),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Additional fields"),
    },
    CREATE,
    async ({ short_description, account, contact, priority, product, assignment_group, additional_fields }) => {
      try {
        const body: Record<string, unknown> = { short_description, ...additional_fields };
        if (account) body.account = account;
        if (contact) body.contact = contact;
        if (priority) body.priority = priority;
        if (product) body.product = product;
        if (assignment_group) body.assignment_group = assignment_group;
        const result = await client.create("sn_customerservice_case", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_csm_case_update",
    "Update a CSM case",
    {
      sys_id: z.string().describe("Case sys_id"),
      fields: z.record(z.string(), z.unknown()).describe("Fields to update"),
    },
    UPDATE,
    async ({ sys_id, fields }) => {
      try {
        const result = await client.update("sn_customerservice_case", sys_id, fields);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
