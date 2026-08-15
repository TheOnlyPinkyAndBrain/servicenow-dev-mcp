import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerIncidentTools } from "../src/tools/it-service-management/incident.js";
import { registerProblemTools } from "../src/tools/it-service-management/problem.js";
import { registerChangeTools } from "../src/tools/it-service-management/change.js";
import { registerApprovalTools } from "../src/tools/it-service-management/approval.js";
import { registerCatalogTools } from "../src/tools/it-service-management/catalog.js";
import { registerSlaTools } from "../src/tools/it-service-management/sla.js";
import { registerOnCallTools } from "../src/tools/it-service-management/on-call.js";
import { registerWalkUpTools } from "../src/tools/it-service-management/walk-up.js";
import { registerUniversalRequestTools } from "../src/tools/it-service-management/universal-request.js";
import { registerCimTools } from "../src/tools/it-service-management/continual-improvement.js";
import { registerOutageTools } from "../src/tools/it-service-management/outage.js";
import { registerIncidentCommsTools } from "../src/tools/it-service-management/incident-communications.js";
import { registerBenchmarkTools } from "../src/tools/it-service-management/benchmarks.js";

type Call = [string, ...unknown[]];
interface Tool {
  name: string;
  annotations: Record<string, unknown> | undefined;
  handler: (args: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }>;
}

function mockClient() {
  const calls: Call[] = [];
  const client = {
    calls,
    query: async (table: string, params: unknown) => {
      calls.push(["query", table, params]);
      return { records: [{ sys_id: "rec1" }], totalCount: 1, limit: 20, offset: 0 };
    },
    getById: async (table: string, sysId: string) => {
      calls.push(["getById", table, sysId]);
      return { sys_id: sysId };
    },
    create: async (table: string, body: unknown) => {
      calls.push(["create", table, body]);
      return { sys_id: "new1", ...(body as object) };
    },
    update: async (table: string, sysId: string, body: unknown) => {
      calls.push(["update", table, sysId, body]);
      return { sys_id: sysId, ...(body as object) };
    },
    restApi: async (method: string, path: string, body?: unknown) => {
      calls.push(["restApi", method, path, body]);
      return { result: { ok: true } };
    },
  };
  return client;
}

// Register a set of ITSM registrars and return a name -> tool map plus the mock client.
function register(mode: Mode, registrars = ALL) {
  const client = mockClient();
  const tools = new Map<string, Tool>();
  const server = {
    tool: (...args: unknown[]) => {
      const name = args[0] as string;
      let annotations: Record<string, unknown> | undefined;
      let handler: Tool["handler"];
      if (typeof args[4] === "function") {
        annotations = args[3] as Record<string, unknown>;
        handler = args[4] as Tool["handler"];
      } else {
        handler = args[3] as Tool["handler"];
      }
      tools.set(name, { name, annotations, handler });
    },
  };
  for (const r of registrars) {
    (r as (s: unknown, c: unknown, m: Mode) => void)(server, client, mode);
  }
  return { tools, client };
}

const ALL = [
  registerIncidentTools,
  registerProblemTools,
  registerChangeTools,
  registerApprovalTools,
  registerCatalogTools,
  registerSlaTools,
  registerOnCallTools,
  registerWalkUpTools,
  registerUniversalRequestTools,
  registerCimTools,
  registerOutageTools,
  registerIncidentCommsTools,
  registerBenchmarkTools,
];

describe("ITSM tool routing (develop mode)", () => {
  it("sn_incident_list queries the incident table", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_incident_list")!.handler({});
    expect(client.calls).toContainEqual(expect.arrayContaining(["query", "incident"]));
  });

  it("sn_incident_create posts to the incident table with short_description", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_incident_create")!.handler({ short_description: "printer down" });
    const create = client.calls.find((c) => c[0] === "create");
    expect(create?.[1]).toBe("incident");
    expect(create?.[2]).toMatchObject({ short_description: "printer down" });
  });

  it("sn_incident_update patches the incident by sys_id", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_incident_update")!.handler({ sys_id: "abc", fields: { state: "6" } });
    expect(client.calls).toContainEqual(["update", "incident", "abc", { state: "6" }]);
  });

  it("sn_incident_task_list queries incident_task", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_incident_task_list")!.handler({ incident: "abc" });
    expect(client.calls.find((c) => c[0] === "query")?.[1]).toBe("incident_task");
  });

  it("sn_problem_task_list queries problem_task", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_problem_task_list")!.handler({});
    expect(client.calls.find((c) => c[0] === "query")?.[1]).toBe("problem_task");
  });

  it("sn_change_model_list queries chg_model", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_change_model_list")!.handler({});
    expect(client.calls.find((c) => c[0] === "query")?.[1]).toBe("chg_model");
  });

  it("sn_change_task_create creates a change_task", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_change_task_create")!.handler({ change_request: "chg1", short_description: "impl" });
    const create = client.calls.find((c) => c[0] === "create");
    expect(create?.[1]).toBe("change_task");
    expect(create?.[2]).toMatchObject({ change_request: "chg1", short_description: "impl" });
  });

  it("sn_change_create routes to the correct sn_chg_rest endpoint per type", async () => {
    const normal = register("develop");
    await normal.tools.get("sn_change_create")!.handler({ type: "normal", short_description: "x" });
    expect(normal.client.calls).toContainEqual(["restApi", "POST", "/api/sn_chg_rest/change/normal", expect.anything()]);

    const emergency = register("develop");
    await emergency.tools.get("sn_change_create")!.handler({ type: "emergency", short_description: "x" });
    expect(emergency.client.calls).toContainEqual(["restApi", "POST", "/api/sn_chg_rest/change/emergency", expect.anything()]);

    const standard = register("develop");
    await standard.tools.get("sn_change_create")!.handler({ type: "standard", short_description: "x", template_id: "TMPL" });
    expect(standard.client.calls).toContainEqual(["restApi", "POST", "/api/sn_chg_rest/change/standard/TMPL", expect.anything()]);
  });

  it("sn_change_conflict_check POSTs to the sn_chg_rest conflict endpoint", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_change_conflict_check")!.handler({ sys_id: "chg9" });
    expect(client.calls).toContainEqual(["restApi", "POST", "/api/sn_chg_rest/change/chg9/conflict", undefined]);
  });

  it("sn_request_list queries sc_request and sn_request_get fetches header + items", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_request_list")!.handler({});
    expect(client.calls.find((c) => c[0] === "query")?.[1]).toBe("sc_request");

    const g = register("develop");
    await g.tools.get("sn_request_get")!.handler({ sys_id: "req1" });
    expect(g.client.calls).toContainEqual(["getById", "sc_request", "req1"]);
    expect(g.client.calls.some((c) => c[0] === "query" && c[1] === "sc_req_item")).toBe(true);
  });

  it("sn_catalog_order_now posts to the Service Catalog order_now endpoint", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_catalog_order_now")!.handler({ cat_item_sys_id: "item1" });
    expect(client.calls).toContainEqual([
      "restApi",
      "POST",
      "/api/sn_sc/servicecatalog/items/item1/order_now",
      expect.anything(),
    ]);
  });

  it("sn_approval_update patches sysapproval_approver", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_approval_update")!.handler({ sys_id: "ap1", state: "approved" });
    expect(client.calls.find((c) => c[0] === "update")?.[1]).toBe("sysapproval_approver");
  });

  it("CIM tools route to sn_cim_register / sn_cim_task / sn_cim_related_kpi", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_cim_initiative_list")!.handler({});
    await tools.get("sn_cim_task_list")!.handler({});
    const tables = client.calls.filter((c) => c[0] === "query").map((c) => c[1]);
    expect(tables).toEqual(expect.arrayContaining(["sn_cim_register", "sn_cim_task"]));

    const g = register("develop");
    await g.tools.get("sn_cim_initiative_get")!.handler({ sys_id: "cim1" });
    expect(g.client.calls).toContainEqual(["getById", "sn_cim_register", "cim1"]);
    const getTables = g.client.calls.filter((c) => c[0] === "query").map((c) => c[1]);
    expect(getTables).toEqual(expect.arrayContaining(["sn_cim_task", "sn_cim_related_kpi"]));
  });

  it("incident communications tools route to incident_alert / incident_alert_task", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_incident_alert_list")!.handler({});
    await tools.get("sn_incident_alert_task_list")!.handler({});
    const tables = client.calls.filter((c) => c[0] === "query").map((c) => c[1]);
    expect(tables).toEqual(expect.arrayContaining(["incident_alert", "incident_alert_task"]));
    const g = register("develop");
    await g.tools.get("sn_incident_alert_get")!.handler({ sys_id: "ia1" });
    expect(g.client.calls).toContainEqual(["getById", "incident_alert", "ia1"]);
  });

  it("benchmark tools route to sn_bm_common_indicator / sn_bm_client_recommendation", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_benchmark_indicator_list")!.handler({});
    await tools.get("sn_benchmark_recommendation_list")!.handler({});
    const tables = client.calls.filter((c) => c[0] === "query").map((c) => c[1]);
    expect(tables).toEqual(expect.arrayContaining(["sn_bm_common_indicator", "sn_bm_client_recommendation"]));
  });

  it("outage tools route to cmdb_ci_outage", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_outage_list")!.handler({});
    expect(client.calls.find((c) => c[0] === "query")?.[1]).toBe("cmdb_ci_outage");
    const g = register("develop");
    await g.tools.get("sn_outage_get")!.handler({ sys_id: "o1" });
    expect(g.client.calls).toContainEqual(["getById", "cmdb_ci_outage", "o1"]);
  });

  it("row-7 tools query their plugin tables", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_oncall_rota_list")!.handler({});
    await tools.get("sn_walkup_queue_list")!.handler({});
    await tools.get("sn_universal_request_list")!.handler({});
    const tables = client.calls.filter((c) => c[0] === "query").map((c) => c[1]);
    expect(tables).toEqual(expect.arrayContaining(["cmn_rota", "wu_location_queue", "universal_request"]));
  });
});

describe("ITSM mode gating", () => {
  it("write tools are absent in debug mode and present in develop mode", () => {
    const debug = register("debug").tools;
    const develop = register("develop").tools;
    for (const w of ["sn_incident_create", "sn_incident_update", "sn_change_create", "sn_change_conflict_check", "sn_catalog_order_now"]) {
      expect(debug.has(w), `${w} should be gated out of debug`).toBe(false);
      expect(develop.has(w), `${w} should exist in develop`).toBe(true);
    }
  });

  it("read tools are available in both modes", () => {
    const debug = register("debug").tools;
    for (const r of ["sn_incident_list", "sn_change_model_list", "sn_request_list", "sn_oncall_rota_list"]) {
      expect(debug.has(r), `${r} should be available in debug`).toBe(true);
    }
  });
});

describe("ITSM MCP annotations", () => {
  it("read tools are annotated readOnlyHint:true", () => {
    const { tools } = register("develop");
    for (const r of ["sn_incident_list", "sn_change_model_list", "sn_request_get", "sn_cab_meeting_list"]) {
      expect(tools.get(r)!.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: true });
    }
  });

  it("create tools are non-read, non-destructive", () => {
    const { tools } = register("develop");
    for (const c of ["sn_incident_create", "sn_change_task_create", "sn_catalog_order_now"]) {
      expect(tools.get(c)!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    }
  });

  it("update tools are destructive + idempotent", () => {
    const { tools } = register("develop");
    for (const u of ["sn_incident_update", "sn_change_update", "sn_approval_update"]) {
      expect(tools.get(u)!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: true });
    }
  });

  it("every ITSM tool carries annotations", () => {
    const { tools } = register("develop");
    const missing = [...tools.values()].filter((t) => !t.annotations).map((t) => t.name);
    expect(missing, `tools missing annotations: ${missing.join(", ")}`).toEqual([]);
  });
});
