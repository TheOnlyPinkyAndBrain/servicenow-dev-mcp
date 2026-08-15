import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerPerformanceAnalyticsTools } from "../src/tools/now-intelligence/performance-analytics.js";

type Call = [string, ...unknown[]];
interface Tool { name: string; annotations: Record<string, unknown> | undefined; handler: (a: Record<string, unknown>) => Promise<unknown>; }

function mockClient() {
  const calls: Call[] = [];
  const client = {
    calls,
    query: async (t: string, p: unknown) => { calls.push(["query", t, p]); return { records: [{ sys_id: "r1" }], totalCount: 1, limit: 20, offset: 0 }; },
    restApi: async (m: string, p: string) => { calls.push(["restApi", m, p]); return { result: {} }; },
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
  (registerPerformanceAnalyticsTools as (s: unknown, c: unknown, m: Mode) => void)(server, client, mode);
  return { tools, client };
}
const qTables = (calls: Call[]) => calls.filter((c) => c[0] === "query").map((c) => c[1]);

describe("now-intelligence routing", () => {
  const cases: [string, string][] = [
    ["sn_pa_indicator_list", "pa_indicators"],
    ["sn_pa_breakdown_list", "pa_breakdowns"],
    ["sn_pa_dashboard_list", "pa_dashboards"],
    ["sn_pa_widget_list", "pa_widgets"],
    ["sn_pa_target_list", "pa_targets"],
    ["sn_pa_threshold_list", "pa_thresholds"],
  ];
  for (const [tool, table] of cases) {
    it(`${tool} -> ${table}`, async () => {
      const { tools, client } = register("develop");
      await tools.get(tool)!.handler({});
      expect(qTables(client.calls)).toContain(table);
    });
  }

  it("sn_pa_scorecards uses the PA scorecards REST API", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_pa_scorecards")!.handler({});
    expect(client.calls.some((c) => c[0] === "restApi" && String(c[2]).includes("/api/now/pa/scorecards"))).toBe(true);
  });

  it("every tool is annotated read-only", () => {
    const { tools } = register("develop");
    expect([...tools.values()].filter((t) => !t.annotations).map((t) => t.name)).toEqual([]);
    expect(tools.get("sn_pa_widget_list")!.annotations).toMatchObject({ readOnlyHint: true });
  });
});
