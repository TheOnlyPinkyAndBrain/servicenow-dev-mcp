import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerTableTools } from "../src/tools/now-platform/table.js";
import { registerSystemTools } from "../src/tools/now-platform/system.js";
import { registerSchemaTools } from "../src/tools/now-platform/schema.js";
import { registerExecuteTools } from "../src/tools/now-platform/execute.js";
import { registerBatchTools } from "../src/tools/now-platform/batch.js";
import { registerAttachmentTools } from "../src/tools/now-platform/attachment.js";
import { registerNotificationTools } from "../src/tools/now-platform/notification.js";
import { registerEmailTools } from "../src/tools/now-platform/email.js";
import { registerUpdateSetTools } from "../src/tools/now-platform/update-set.js";
import { registerDataPolicyTools } from "../src/tools/now-platform/data-policy.js";
import { registerDiagnosticsTools } from "../src/tools/now-platform/diagnostics.js";
import { registerScheduledJobTools } from "../src/tools/now-platform/scheduled-job.js";
import { registerScopeTools } from "../src/tools/now-platform/scope.js";
import { registerDomainTools } from "../src/tools/now-platform/domain.js";
import { registerLogTools } from "../src/tools/now-platform/logs.js";
import { registerUpgradeTools } from "../src/tools/now-platform/upgrade.js";

type Call = [string, ...unknown[]];
interface Tool {
  name: string;
  annotations: Record<string, unknown> | undefined;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

function mockClient() {
  const calls: Call[] = [];
  const client = {
    calls,
    query: async (t: string, p: unknown) => { calls.push(["query", t, p]); return { records: [{ sys_id: "r1" }], totalCount: 1, limit: 20, offset: 0 }; },
    getById: async (t: string, s: string) => { calls.push(["getById", t, s]); return { sys_id: s }; },
    create: async (t: string, b: unknown) => { calls.push(["create", t, b]); return { sys_id: "n1", ...(b as object) }; },
    update: async (t: string, s: string, b: unknown) => { calls.push(["update", t, s, b]); return { sys_id: s, ...(b as object) }; },
    delete: async (t: string, s: string) => { calls.push(["delete", t, s]); return undefined; },
    restApi: async (m: string, p: string, b?: unknown) => { calls.push(["restApi", m, p, b]); return { result: {} }; },
    aggregate: async (t: string, p: unknown) => { calls.push(["aggregate", t, p]); return []; },
    executeBackgroundScript: async (s: string) => { calls.push(["execScript", s]); return { success: true, output: "" }; },
    batchRequest: async (r: unknown) => { calls.push(["batch", r]); return {}; },
  };
  return client;
}

const REGISTRARS = [
  registerTableTools, registerSystemTools, registerSchemaTools, registerExecuteTools, registerBatchTools,
  registerAttachmentTools, registerNotificationTools, registerEmailTools, registerUpdateSetTools,
  registerDataPolicyTools, registerDiagnosticsTools, registerScheduledJobTools, registerScopeTools,
  registerDomainTools, registerLogTools, registerUpgradeTools,
];

function register(mode: Mode) {
  const client = mockClient();
  const tools = new Map<string, Tool>();
  const server = {
    tool: (...args: unknown[]) => {
      const name = args[0] as string;
      let annotations: Record<string, unknown> | undefined;
      let handler: Tool["handler"];
      if (typeof args[4] === "function") { annotations = args[3] as Record<string, unknown>; handler = args[4] as Tool["handler"]; }
      else { handler = args[3] as Tool["handler"]; }
      tools.set(name, { name, annotations, handler });
    },
  };
  for (const r of REGISTRARS) (r as (s: unknown, c: unknown, m: Mode) => void)(server, client, mode);
  return { tools, client };
}

const qTables = (calls: Call[]) => calls.filter((c) => c[0] === "query").map((c) => c[1]);

describe("now-platform new completeness tools route correctly", () => {
  const cases: [string, string][] = [
    ["sn_schedule_list", "cmn_schedule"],
    ["sn_report_list", "sys_report"],
    ["sn_template_list", "sys_template"],
    ["sn_currency_list", "fx_currency"],
    ["sn_event_registry_list", "sysevent_register"],
    ["sn_email_template_list", "sysevent_email_template"],
    ["sn_archive_rule_list", "sys_archive"],
  ];
  for (const [tool, table] of cases) {
    it(`${tool} -> ${table}`, async () => {
      const { tools, client } = register("develop");
      await tools.get(tool)!.handler({});
      expect(qTables(client.calls)).toContain(table);
    });
  }
});

describe("now-platform core routing", () => {
  it("table CRUD routes to the table module methods", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_table_query")!.handler({ table: "incident" });
    await tools.get("sn_table_create")!.handler({ table: "incident", fields: { short_description: "x" } });
    await tools.get("sn_table_delete")!.handler({ table: "incident", sys_id: "s1" });
    expect(client.calls.some((c) => c[0] === "query" && c[1] === "incident")).toBe(true);
    expect(client.calls.some((c) => c[0] === "create" && c[1] === "incident")).toBe(true);
    expect(client.calls.some((c) => c[0] === "delete" && c[1] === "incident")).toBe(true);
  });
});

describe("now-platform mode gating", () => {
  it("write/exec tools are develop-only", () => {
    const debug = register("debug").tools;
    const develop = register("develop").tools;
    for (const w of ["sn_table_create", "sn_table_update", "sn_table_delete", "sn_sys_property_set", "sn_script_execute", "sn_attachment_delete"]) {
      expect(debug.has(w), `${w} gated out of debug`).toBe(false);
      expect(develop.has(w), `${w} present in develop`).toBe(true);
    }
  });
});

describe("now-platform annotations", () => {
  it("every tool is annotated", () => {
    const { tools } = register("develop");
    const missing = [...tools.values()].filter((t) => !t.annotations).map((t) => t.name);
    expect(missing, `missing annotations: ${missing.join(", ")}`).toEqual([]);
  });

  it("script execution and batch are non-read, destructive, non-idempotent", () => {
    const { tools } = register("develop");
    for (const e of ["sn_script_execute", "sn_batch_request"]) {
      expect(tools.get(e)!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: false });
    }
  });

  it("table create/update/delete carry the right hints", () => {
    const { tools } = register("develop");
    expect(tools.get("sn_table_create")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    expect(tools.get("sn_table_update")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: true });
    expect(tools.get("sn_table_delete")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    expect(tools.get("sn_report_list")!.annotations).toMatchObject({ readOnlyHint: true });
  });
});
