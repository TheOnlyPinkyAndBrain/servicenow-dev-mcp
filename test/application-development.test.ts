import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerScriptTools } from "../src/tools/application-development/script.js";
import { registerFlowTools } from "../src/tools/application-development/flow.js";
import { registerWorkflowTools } from "../src/tools/application-development/workflow.js";
import { registerCicdTools } from "../src/tools/application-development/cicd.js";

type Call = [string, ...unknown[]];
interface Tool { name: string; annotations: Record<string, unknown> | undefined; handler: (a: Record<string, unknown>) => Promise<unknown>; }

function mockClient() {
  const calls: Call[] = [];
  const client = {
    calls,
    query: async (t: string, p: unknown) => { calls.push(["query", t, p]); return { records: [{ sys_id: "r1" }], totalCount: 1, limit: 20, offset: 0 }; },
    getById: async (t: string, s: string) => { calls.push(["getById", t, s]); return { sys_id: s }; },
    create: async (t: string, b: unknown) => { calls.push(["create", t, b]); return { sys_id: "n1", ...(b as object) }; },
    update: async (t: string, s: string, b: unknown) => { calls.push(["update", t, s, b]); return { sys_id: s }; },
    restApi: async (m: string, p: string, b?: unknown) => { calls.push(["restApi", m, p, b]); return { result: {} }; },
  };
  return client;
}

const REGISTRARS = [registerScriptTools, registerFlowTools, registerWorkflowTools, registerCicdTools];
function register(mode: Mode) {
  const client = mockClient();
  const tools = new Map<string, Tool>();
  const server = { tool: (...a: unknown[]) => {
    const name = a[0] as string;
    let annotations: Record<string, unknown> | undefined; let handler: Tool["handler"];
    if (typeof a[4] === "function") { annotations = a[3] as Record<string, unknown>; handler = a[4] as Tool["handler"]; }
    else { handler = a[3] as Tool["handler"]; }
    tools.set(name, { name, annotations, handler });
  } };
  for (const r of REGISTRARS) (r as (s: unknown, c: unknown, m: Mode) => void)(server, client, mode);
  return { tools, client };
}
const qTables = (calls: Call[]) => calls.filter((c) => c[0] === "query").map((c) => c[1]);

describe("sn_script_list routes each type to the correct table (regression for the fixed names)", () => {
  const cases: [string, string][] = [
    ["business_rule", "sys_script"],
    ["script_include", "sys_script_include"],
    ["client_script", "sys_script_client"],
    ["fix_script", "sys_script_fix"],
    ["email_script", "sys_script_email"],
  ];
  for (const [type, table] of cases) {
    it(`${type} -> ${table}`, async () => {
      const { tools, client } = register("develop");
      await tools.get("sn_script_list")!.handler({ type });
      expect(qTables(client.calls)).toContain(table);
    });
  }
});

describe("application-development routing", () => {
  it("flow tools -> sys_hub_flow / action types", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_flow_list")!.handler({});
    await tools.get("sn_flow_action_type_list")!.handler({});
    expect(qTables(client.calls)).toEqual(expect.arrayContaining(["sys_hub_flow", "sys_hub_action_type_definition"]));
  });
  it("sn_atf_step_list -> sys_atf_step", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_atf_step_list")!.handler({});
    expect(qTables(client.calls)).toContain("sys_atf_step");
  });
  it("sn_workflow_list -> a workflow table", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_workflow_list")!.handler({});
    expect(client.calls.some((c) => c[0] === "query" && /wf_/.test(String(c[1])))).toBe(true);
  });
});

describe("application-development gating + annotations", () => {
  it("write/action tools are develop-only", () => {
    const debug = register("debug").tools;
    const develop = register("develop").tools;
    for (const w of ["sn_script_create", "sn_flow_create", "sn_cicd_run_test_suite", "sn_cicd_activate_plugin"]) {
      expect(debug.has(w), `${w} gated`).toBe(false);
      expect(develop.has(w), `${w} present`).toBe(true);
    }
  });
  it("CI/CD action tools carry the ACTION annotation", () => {
    const { tools } = register("develop");
    for (const a of ["sn_cicd_run_test_suite", "sn_cicd_activate_plugin", "sn_cicd_apply_source_control"]) {
      expect(tools.get(a)!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    }
  });
  it("every tool is annotated; reads are readOnly", () => {
    const { tools } = register("develop");
    expect([...tools.values()].filter((t) => !t.annotations).map((t) => t.name)).toEqual([]);
    expect(tools.get("sn_script_list")!.annotations).toMatchObject({ readOnlyHint: true });
    expect(tools.get("sn_script_create")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
  });
});
