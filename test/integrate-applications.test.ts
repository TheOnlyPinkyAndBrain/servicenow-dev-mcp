import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerImportSetTools } from "../src/tools/integrate-applications/import-set.js";
import { registerIntegrationTools } from "../src/tools/integrate-applications/integration.js";
import { registerRestApiTools } from "../src/tools/integrate-applications/rest-api.js";

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

const REGISTRARS = [registerImportSetTools, registerIntegrationTools, registerRestApiTools];
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

describe("integrate-applications new tools route correctly", () => {
  const cases: [string, string][] = [
    ["sn_data_source_list", "sys_data_source"],
    ["sn_scheduled_import_list", "scheduled_import_set"],
    ["sn_soap_message_list", "sys_soap_message"],
    ["sn_web_service_list", "sys_web_service"],
  ];
  for (const [tool, table] of cases) {
    it(`${tool} -> ${table}`, async () => {
      const { tools, client } = register("develop");
      await tools.get(tool)!.handler({});
      expect(qTables(client.calls)).toContain(table);
    });
  }
});

describe("integrate-applications gating + annotations", () => {
  it("scripted REST API write tools are develop-only", () => {
    const debug = register("debug").tools;
    const develop = register("develop").tools;
    for (const w of ["sn_rest_api_create", "sn_rest_api_resource_create", "sn_rest_api_resource_update"]) {
      expect(debug.has(w), `${w} gated`).toBe(false);
      expect(develop.has(w), `${w} present`).toBe(true);
    }
  });
  it("every tool is annotated; new tools are read-only", () => {
    const { tools } = register("develop");
    expect([...tools.values()].filter((t) => !t.annotations).map((t) => t.name)).toEqual([]);
    for (const r of ["sn_data_source_list", "sn_soap_message_list", "sn_web_service_list"]) {
      expect(tools.get(r)!.annotations).toMatchObject({ readOnlyHint: true });
    }
    expect(tools.get("sn_rest_api_create")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
  });
});
