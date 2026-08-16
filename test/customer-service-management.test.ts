import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerCsmTools } from "../src/tools/customer-service-management/csm.js";

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
  };
  return client;
}

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
  (registerCsmTools as (s: unknown, c: unknown, m: Mode) => void)(server, client, mode);
  return { tools, client };
}
const qTables = (calls: Call[]) => calls.filter((c) => c[0] === "query").map((c) => c[1]);

describe("CSM routing", () => {
  it("read tools hit their tables", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_csm_case_list")!.handler({});
    await tools.get("sn_csm_account_list")!.handler({});
    await tools.get("sn_csm_contact_list")!.handler({});
    expect(qTables(client.calls)).toEqual(expect.arrayContaining(["sn_customerservice_case", "customer_account", "customer_contact"]));
  });

  it("sn_csm_case_get fetches the case (+ related tasks)", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_csm_case_get")!.handler({ sys_id: "c1" });
    expect(client.calls).toContainEqual(["getById", "sn_customerservice_case", "c1"]);
  });

  it("case create/update route to sn_customerservice_case", async () => {
    const c = register("develop");
    await c.tools.get("sn_csm_case_create")!.handler({ short_description: "x" });
    expect(c.client.calls.find((x) => x[0] === "create")?.[1]).toBe("sn_customerservice_case");
    const u = register("develop");
    await u.tools.get("sn_csm_case_update")!.handler({ sys_id: "c1", fields: { state: "6" } });
    expect(u.client.calls.find((x) => x[0] === "update")?.[1]).toBe("sn_customerservice_case");
  });
});

describe("CSM gating + annotations", () => {
  it("write tools are develop-only", () => {
    const debug = register("debug").tools;
    const develop = register("develop").tools;
    for (const w of ["sn_csm_case_create", "sn_csm_case_update"]) {
      expect(debug.has(w), `${w} gated`).toBe(false);
      expect(develop.has(w), `${w} present`).toBe(true);
    }
  });
  it("every tool annotated; reads readOnly, create non-destructive, update destructive", () => {
    const { tools } = register("develop");
    expect([...tools.values()].filter((t) => !t.annotations).map((t) => t.name)).toEqual([]);
    expect(tools.get("sn_csm_case_list")!.annotations).toMatchObject({ readOnlyHint: true });
    expect(tools.get("sn_csm_case_create")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    expect(tools.get("sn_csm_case_update")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
  });
});
