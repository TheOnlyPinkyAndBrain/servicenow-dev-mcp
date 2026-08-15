import { describe, it, expect } from "vitest";
import type { Mode } from "../src/types.js";
import { registerSecurityTools } from "../src/tools/platform-security/security.js";
import { registerAclTools } from "../src/tools/platform-security/acl.js";

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

const REGISTRARS = [registerSecurityTools, registerAclTools];
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

describe("platform-security routing", () => {
  const cases: [string, string, Record<string, unknown>][] = [
    ["sn_user_criteria_list", "user_criteria", {}],
    ["sn_oauth_entity_list", "oauth_entity", {}],
    ["sn_ldap_server_list", "ldap_server_config", {}],
    ["sn_acl_roles", "sys_security_acl_role", { acl_sys_id: "a1" }],
    ["sn_user_list", "sys_user", {}],
    ["sn_acl_list", "sys_security_acl", {}],
  ];
  for (const [tool, table, args] of cases) {
    it(`${tool} -> ${table}`, async () => {
      const { tools, client } = register("develop");
      await tools.get(tool)!.handler(args);
      expect(qTables(client.calls)).toContain(table);
    });
  }
});

describe("platform-security gating + annotations", () => {
  it("ACL write tools are develop-only", () => {
    const debug = register("debug").tools;
    const develop = register("develop").tools;
    for (const w of ["sn_acl_create", "sn_acl_update"]) {
      expect(debug.has(w), `${w} gated`).toBe(false);
      expect(develop.has(w), `${w} present`).toBe(true);
    }
  });
  it("every tool is annotated; new reads readOnly, acl_create non-destructive", () => {
    const { tools } = register("develop");
    expect([...tools.values()].filter((t) => !t.annotations).map((t) => t.name)).toEqual([]);
    for (const r of ["sn_user_criteria_list", "sn_oauth_entity_list", "sn_acl_roles"]) {
      expect(tools.get(r)!.annotations).toMatchObject({ readOnlyHint: true });
    }
    expect(tools.get("sn_acl_create")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    expect(tools.get("sn_acl_update")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
  });
});
