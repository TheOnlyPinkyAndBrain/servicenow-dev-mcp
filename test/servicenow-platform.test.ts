import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerCmdbTools } from "../src/tools/servicenow-platform/cmdb.js";
import { registerKnowledgeTools } from "../src/tools/servicenow-platform/knowledge.js";
import { registerAclTools } from "../src/tools/platform-security/acl.js";
import { registerUiConfigTools } from "../src/tools/platform-user-interface/ui-policy.js";
import { registerInteractionTools } from "../src/tools/servicenow-platform/interaction.js";
import { registerSkillTools } from "../src/tools/servicenow-platform/skills.js";

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

const REGISTRARS = [registerCmdbTools, registerKnowledgeTools, registerAclTools, registerUiConfigTools, registerInteractionTools, registerSkillTools];

function register(mode: Mode) {
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
  for (const r of REGISTRARS) (r as (s: unknown, c: unknown, m: Mode) => void)(server, client, mode);
  return { tools, client };
}

function queryTables(calls: Call[]) {
  return calls.filter((c) => c[0] === "query").map((c) => c[1]);
}

describe("servicenow-platform routing (develop)", () => {
  it("CMDB read tools hit the right tables", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_cmdb_ci_list")!.handler({});
    await tools.get("sn_cmdb_rel_type_list")!.handler({});
    await tools.get("sn_cmdb_health_list")!.handler({});
    expect(queryTables(client.calls)).toEqual(expect.arrayContaining(["cmdb_ci", "cmdb_rel_type", "cmdb_health_result"]));
  });

  it("sn_cmdb_instance_get and identify_reconcile use the CMDB/IRE REST APIs", async () => {
    const g = register("develop");
    await g.tools.get("sn_cmdb_instance_get")!.handler({ ci_class: "cmdb_ci_linux_server", sys_id: "ci1" });
    expect(g.client.calls).toContainEqual(["restApi", "GET", "/api/now/cmdb/instance/cmdb_ci_linux_server/ci1", undefined]);

    const r = register("develop");
    await r.tools.get("sn_cmdb_identify_reconcile")!.handler({ items: [{ className: "cmdb_ci", values: {} }] });
    expect(r.client.calls.some((c) => c[0] === "restApi" && c[1] === "POST" && String(c[2]).startsWith("/api/now/identifyreconcile"))).toBe(true);
  });

  it("sn_cmdb_rel_create creates a cmdb_rel_ci with parent/child/type", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_cmdb_rel_create")!.handler({ parent: "a", child: "b", type: "t" });
    expect(client.calls).toContainEqual(["create", "cmdb_rel_ci", { parent: "a", child: "b", type: "t" }]);
  });

  it("Knowledge tools route correctly", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_knowledge_article_list")!.handler({});
    await tools.get("sn_knowledge_block_list")!.handler({});
    expect(queryTables(client.calls)).toEqual(expect.arrayContaining(["kb_knowledge", "kb_knowledge_block"]));
  });

  it("sn_knowledge_search uses the KM API", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_knowledge_search")!.handler({ query: "vpn" });
    expect(client.calls.some((c) => c[0] === "restApi" && String(c[2]).includes("/api/sn_km_api/knowledge/articles"))).toBe(true);
  });

  it("sn_knowledge_article_versions queries kb_version by the 'knowledge' reference", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_knowledge_article_versions")!.handler({ article: "KB1" });
    const q = client.calls.find((c) => c[0] === "query" && c[1] === "kb_version");
    expect(q).toBeTruthy();
    expect((q![2] as { sysparm_query: string }).sysparm_query).toContain("knowledge=KB1");
  });
});

describe("completeness gap tools (interaction, skills, CSDM)", () => {
  it("interaction tools route to interaction + related records", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_interaction_list")!.handler({});
    expect(queryTables(client.calls)).toContain("interaction");
    const g = register("develop");
    await g.tools.get("sn_interaction_get")!.handler({ sys_id: "int1" });
    expect(g.client.calls).toContainEqual(["getById", "interaction", "int1"]);
    expect(queryTables(g.client.calls)).toContain("interaction_related_record");
  });

  it("sn_skill_list queries cmn_skill", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_skill_list")!.handler({});
    expect(queryTables(client.calls)).toContain("cmn_skill");
  });

  it("CSDM tools query service_offering and cmdb_ci_business_app", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_service_offering_list")!.handler({});
    await tools.get("sn_business_app_list")!.handler({});
    expect(queryTables(client.calls)).toEqual(expect.arrayContaining(["service_offering", "cmdb_ci_business_app"]));
  });
});

describe("relocated config tools land in the right modules", () => {
  it("ACL tools query sys_security_acl", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_acl_list")!.handler({});
    expect(queryTables(client.calls)).toContain("sys_security_acl");
    await tools.get("sn_acl_create")!.handler({ data: { name: "x" } });
    expect(client.calls.find((c) => c[0] === "create")?.[1]).toBe("sys_security_acl");
  });

  it("UI config tools query sys_ui_policy / sys_ui_action", async () => {
    const { tools, client } = register("develop");
    await tools.get("sn_ui_policy_list")!.handler({});
    await tools.get("sn_ui_action_list")!.handler({});
    expect(queryTables(client.calls)).toEqual(expect.arrayContaining(["sys_ui_policy", "sys_ui_action"]));
  });
});

describe("servicenow-platform mode gating", () => {
  it("write tools are develop-only", () => {
    const debug = register("debug").tools;
    const develop = register("develop").tools;
    for (const w of ["sn_cmdb_rel_create", "sn_cmdb_instance_create", "sn_knowledge_article_create", "sn_acl_create", "sn_ui_policy_create"]) {
      expect(debug.has(w), `${w} gated out of debug`).toBe(false);
      expect(develop.has(w), `${w} present in develop`).toBe(true);
    }
  });

  it("read tools available in both modes", () => {
    const debug = register("debug").tools;
    for (const r of ["sn_cmdb_rel_type_list", "sn_cmdb_health_list", "sn_knowledge_article_versions", "sn_knowledge_block_list", "sn_acl_list", "sn_ui_policy_list"]) {
      expect(debug.has(r), `${r} available in debug`).toBe(true);
    }
  });
});

describe("servicenow-platform annotations", () => {
  it("reads readOnly, creates non-destructive, updates destructive, IRE is idempotent action", () => {
    const { tools } = register("develop");
    expect(tools.get("sn_cmdb_rel_type_list")!.annotations).toMatchObject({ readOnlyHint: true });
    expect(tools.get("sn_knowledge_block_list")!.annotations).toMatchObject({ readOnlyHint: true });
    expect(tools.get("sn_cmdb_rel_create")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    expect(tools.get("sn_knowledge_article_update")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    expect(tools.get("sn_cmdb_identify_reconcile")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
  });

  it("every tool carries annotations", () => {
    const { tools } = register("develop");
    const missing = [...tools.values()].filter((t) => !t.annotations).map((t) => t.name);
    expect(missing, `missing annotations: ${missing.join(", ")}`).toEqual([]);
  });
});
