import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "../../client.js";
import type { Mode } from "../../types.js";
import { errorResult, jsonResult } from "../../utils.js";
import { ACTION, READ } from "../../annotations.js";

export function registerCicdTools(
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
): void {
  server.tool(
    "sn_atf_test_list",
    "List Automated Test Framework (ATF) tests",
    {
      name: z.string().optional().describe("Test name (contains match)"),
      active: z.boolean().optional().describe("Active status (default true)"),
      sys_scope: z.string().optional().describe("Application scope sys_id"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, sys_scope, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        if (sys_scope) qp.push(`sys_scope=${sys_scope}`);
        qp.push("ORDERBYname");

        const result = await client.query("sys_atf_test", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,active,sys_scope,sys_updated_on",
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
    "sn_atf_suite_list",
    "List ATF test suites",
    {
      name: z.string().optional().describe("Suite name (contains match)"),
      active: z.boolean().optional().describe("Active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYname");

        const result = await client.query("sys_atf_test_suite", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,description,active,sys_scope,sys_updated_on",
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
    "sn_atf_result_list",
    "List ATF test execution results",
    {
      test: z.string().optional().describe("Test sys_id"),
      test_suite: z.string().optional().describe("Test suite sys_id"),
      status: z.enum(["success", "failure", "error"]).optional().describe("Result status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ test, test_suite, status, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (test) qp.push(`test=${test}`);
        if (test_suite) qp.push(`test_suite=${test_suite}`);
        if (status) qp.push(`status=${status}`);
        qp.push("ORDERBYDESCsys_created_on");

        const result = await client.query("sys_atf_test_result", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,test,test_suite,status,start_time,end_time,duration,output,sys_created_on",
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
    "sn_installed_app_list",
    "List installed applications (sys_store_app and sys_app)",
    {
      name: z.string().optional().describe("App name (contains match)"),
      scope: z.string().optional().describe("App scope (contains match)"),
      active: z.boolean().optional().describe("Active status"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 20)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, scope, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (scope) qp.push(`scopeLIKE${scope}`);
        if (active !== undefined) qp.push(`active=${active}`);
        qp.push("ORDERBYname");

        const [storeApps, customApps] = await Promise.all([
          client.query("sys_store_app", {
            sysparm_query: qp.join("^"),
            sysparm_fields: "sys_id,name,scope,version,active,vendor,sys_updated_on",
            sysparm_limit: limit,
            sysparm_offset: offset,
            sysparm_display_value: "true",
          }),
          client.query("sys_app", {
            sysparm_query: qp.join("^"),
            sysparm_fields: "sys_id,name,scope,version,active,vendor,sys_updated_on",
            sysparm_limit: limit,
            sysparm_offset: offset,
            sysparm_display_value: "true",
          }),
        ]);

        return jsonResult({
          storeApps: { count: storeApps.records.length, records: storeApps.records },
          customApps: { count: customApps.records.length, records: customApps.records },
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_plugin_list",
    "List installed/active plugins",
    {
      name: z.string().optional().describe("Plugin name (contains match)"),
      active: z.boolean().optional().describe("Active status (default true)"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ name, active, limit, offset }) => {
      try {
        const qp: string[] = [];
        if (name) qp.push(`nameLIKE${name}`);
        if (active !== undefined) qp.push(`active=${active}`);
        else qp.push("active=true");
        qp.push("ORDERBYname");

        const result = await client.query("v_plugin", {
          sysparm_query: qp.join("^"),
          sysparm_fields: "sys_id,name,source,active,version,sys_updated_on",
          sysparm_limit: limit ?? 50,
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
    "sn_atf_step_list",
    "List ATF test steps (sys_atf_step) — the ordered steps within an Automated Test Framework test.",
    {
      test: z.string().optional().describe("Filter by parent ATF test sys_id (sys_atf_test)"),
      query: z.string().optional().describe("Additional encoded query"),
      limit: z.coerce.number().min(1).max(100).optional().describe("Max records (default 50)"),
      offset: z.coerce.number().min(0).optional().describe("Offset for pagination"),
    },
    READ,
    async ({ test, query, limit, offset }) => {
      try {
        const queryParts: string[] = [];
        if (test) queryParts.push(`test=${test}`);
        if (query) queryParts.push(query);
        queryParts.push("ORDERBYorder");
        const result = await client.query("sys_atf_step", {
          sysparm_query: queryParts.join("^"),
          sysparm_fields: "sys_id,test,step_config,order,active,description,sys_updated_on",
          sysparm_limit: limit ?? 50,
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
    "sn_cicd_run_test_suite",
    "Run an ATF test suite via the CI/CD API (sn_cicd)",
    {
      test_suite_sys_id: z.string().describe("Test suite sys_id"),
    },
    ACTION,
    async ({ test_suite_sys_id }) => {
      try {
        const result = await client.restApi(
          "GET",
          `/api/sn_cicd/testsuite/run?test_suite_sys_id=${test_suite_sys_id}`
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_cicd_activate_plugin",
    "Activate a plugin via the CI/CD API",
    {
      plugin_id: z.string().describe("Plugin ID to activate"),
    },
    ACTION,
    async ({ plugin_id }) => {
      try {
        const result = await client.restApi(
          "POST",
          `/api/sn_cicd/plugin/${plugin_id}/activate`
        );
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "sn_cicd_apply_source_control",
    "Apply source control changes via CI/CD API",
    {
      app_scope: z.string().describe("Application scope"),
      branch_name: z.string().optional().describe("Branch name"),
    },
    ACTION,
    async ({ app_scope, branch_name }) => {
      try {
        const body: Record<string, unknown> = { app_scope };
        if (branch_name) body.branch_name = branch_name;
        const result = await client.restApi("POST", "/api/sn_cicd/sc/apply_changes", body);
        return jsonResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
