import { describe, it, expect } from "vitest";
import { z } from "zod";
import { registrars } from "../src/tools/registry.js";
import type { Mode } from "../src/types.js";

interface Recorded {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

/**
 * Exercise every registrar with a mock server + client (registration never
 * calls the client) and collect what each registers. This is exactly what the
 * real server does at boot, so it catches duplicate names, missing/short
 * descriptions, invalid zod schemas, and mode-gating regressions — none of
 * which the TypeScript build can see.
 */
function collectTools(mode: Mode): Recorded[] {
  const tools: Recorded[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      const name = args[0] as string;
      let description = "";
      let schema: Record<string, unknown> = {};
      if (typeof args[1] === "string") {
        description = args[1];
        schema = (args[2] as Record<string, unknown>) ?? {};
      } else {
        schema = (args[1] as Record<string, unknown>) ?? {};
      }
      tools.push({ name, description, schema });
    },
  } as unknown as Parameters<(typeof registrars)[number]>[0];

  const client = {} as unknown as Parameters<(typeof registrars)[number]>[1];

  for (const register of registrars) register(server, client, mode);
  return tools;
}

function findDuplicates(names: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const n of names) {
    if (seen.has(n)) dupes.add(n);
    seen.add(n);
  }
  return [...dupes].sort();
}

const debugTools = collectTools("debug");
const developTools = collectTools("develop");

describe("tool registration contract", () => {
  it("registers a substantial number of tools in both modes", () => {
    expect(debugTools.length).toBeGreaterThan(100);
    expect(developTools.length).toBeGreaterThanOrEqual(debugTools.length);
  });

  it("has no duplicate tool names in debug mode", () => {
    const dupes = findDuplicates(debugTools.map((t) => t.name));
    expect(dupes, `duplicate tools (debug): ${dupes.join(", ")}`).toEqual([]);
  });

  it("has no duplicate tool names in develop mode", () => {
    const dupes = findDuplicates(developTools.map((t) => t.name));
    expect(dupes, `duplicate tools (develop): ${dupes.join(", ")}`).toEqual([]);
  });

  it("gates writes: every debug tool also exists in develop", () => {
    const developNames = new Set(developTools.map((t) => t.name));
    const leaked = debugTools
      .map((t) => t.name)
      .filter((n) => !developNames.has(n));
    expect(leaked, `debug tools missing from develop: ${leaked.join(", ")}`).toEqual([]);
  });

  it("registers develop-only (write) tools that are absent in debug mode", () => {
    const debugNames = new Set(debugTools.map((t) => t.name));
    const writeOnly = developTools.filter((t) => !debugNames.has(t.name));
    expect(writeOnly.length).toBeGreaterThan(0);
  });

  it("every tool name follows the sn_snake_case convention", () => {
    const bad = developTools
      .filter((t) => !/^sn_[a-z0-9_]+$/.test(t.name))
      .map((t) => t.name);
    expect(bad, `invalid tool names: ${bad.join(", ")}`).toEqual([]);
  });

  it("every tool has a meaningful description", () => {
    const bad = developTools
      .filter((t) => !t.description || t.description.trim().length < 10)
      .map((t) => t.name);
    expect(bad, `tools with missing/short descriptions: ${bad.join(", ")}`).toEqual([]);
  });

  it("every tool schema is a record of zod validators", () => {
    const bad: string[] = [];
    for (const t of developTools) {
      const values = Object.values(t.schema);
      const allZod = values.every((v) => v instanceof z.ZodType);
      let buildable = true;
      try {
        z.object(t.schema as z.ZodRawShape);
      } catch {
        buildable = false;
      }
      if (!allZod || !buildable) bad.push(t.name);
    }
    expect(bad, `tools with invalid zod schema: ${bad.join(", ")}`).toEqual([]);
  });
});
