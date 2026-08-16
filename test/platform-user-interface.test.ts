import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerUiTools } from "../src/tools/platform-user-interface/ui.js";
import { registerServicePortalTools } from "../src/tools/platform-user-interface/service-portal.js";

type Call = [string, ...unknown[]];
interface Tool { name: string; annotations: Record<string, unknown> | undefined; handler: (a: Record<string, unknown>) => Promise<unknown>; }

function mockClient() {
  const calls: Call[] = [];
  const client = {
    calls,
    query: async (t: string, p: unknown) => { calls.push(["query", t, p]); return { records: [{ sys_id: "r1" }], totalCount: 1, limit: 20, offset: 0 }; },
    getById: async (t: string, s: string) => { calls.push(["getById", t, s]); return { sys_id: s }; },
  };
  return client;
}

const REGISTRARS = [registerUiTools, registerServicePortalTools];
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

describe("platform-user-interface routing", () => {
  it("UI tools route to their tables", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_ui_page_list")!.handler({});
    await tools.get("sn_ui_view_list")!.handler({});
    await tools.get("sn_ui_macro_list")!.handler({});
    expect(qTables(client.calls)).toEqual(expect.arrayContaining(["sys_ui_page", "sys_ui_view", "sys_ui_macro"]));
  });

  it("service portal tools route to sp_* tables; widget_get fetches instances too", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_portal_list")!.handler({});
    expect(qTables(client.calls)).toContain("sp_portal");
    const g = register("develop");
    await g.tools.get("sn_portal_widget_get")!.handler({ sys_id: "w1" });
    expect(g.client.calls).toContainEqual(["getById", "sp_widget", "w1"]);
    expect(qTables(g.client.calls)).toContain("sp_instance");
  });
});

describe("platform-user-interface dedup + annotations", () => {
  it("the removed sn_sp_* duplicates are gone (superseded by sn_portal_*)", () => {
    const { tools } = register("develop");
    for (const removed of ["sn_sp_portal_list", "sn_sp_page_list", "sn_sp_widget_list", "sn_sp_widget_get", "sn_sp_angular_provider_list"]) {
      expect(tools.has(removed), `${removed} should have been removed`).toBe(false);
    }
    // canonical replacements still present
    for (const kept of ["sn_portal_list", "sn_portal_page_list", "sn_portal_widget_list", "sn_portal_widget_get", "sn_portal_angular_provider_list"]) {
      expect(tools.has(kept), `${kept} should exist`).toBe(true);
    }
  });

  it("every tool is annotated read-only (module is read-only)", () => {
    const { tools } = register("develop");
    expect([...tools.values()].filter((t) => !t.annotations).map((t) => t.name)).toEqual([]);
    expect(tools.get("sn_ui_view_list")!.annotations).toMatchObject({ readOnlyHint: true });
  });
});
