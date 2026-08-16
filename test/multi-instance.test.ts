import { describe, it, expect, vi } from "vitest";
import { ServiceNowClient } from "../src/client.js";
import type { ServiceNowConfig, InstanceConfig } from "../src/types.js";

function instanceConfig(name: string): InstanceConfig {
  return {
    instanceUrl: `https://${name}.service-now.com`,
    authMethod: "basic",
    username: "admin",
    password: "pw",
  };
}

function config(names: string[], defaultInstance = names[0]): ServiceNowConfig {
  const instances: Record<string, InstanceConfig> = {};
  for (const n of names) instances[n] = instanceConfig(n);
  return { instances, defaultInstance, mode: "debug", enableScriptExecute: false };
}

// A minimal stand-in for McpServer -- only the elicitInput surface
// ServiceNowClient actually calls.
function fakeMcpServer(elicitInput: (...args: unknown[]) => unknown) {
  return { server: { elicitInput } } as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer;
}

describe("single-instance config (backward compatible)", () => {
  it("never prompts and reports the sole instance as active", async () => {
    const server = fakeMcpServer(() => {
      throw new Error("elicitInput should not be called with a single instance");
    });
    const client = new ServiceNowClient(config(["default"]), server);

    expect(client.getActiveInstanceName()).toBe("default");
    await client.resolveActiveInstance();
    expect(client.getActiveInstanceName()).toBe("default");
    expect(client.listInstances()).toEqual([
      { name: "default", instanceUrl: "https://default.service-now.com", authMethod: "basic", active: true },
    ]);
  });
});

describe("multi-instance config", () => {
  it("defaults to the configured default instance before resolution", () => {
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(vi.fn()));
    expect(client.getActiveInstanceName()).toBe("prod");
  });

  it("prompts via elicitation once, applies the chosen instance, and doesn't prompt again", async () => {
    const elicitInput = vi.fn().mockResolvedValue({ action: "accept", content: { instance: "dev" } });
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(elicitInput));

    await client.resolveActiveInstance();
    expect(client.getActiveInstanceName()).toBe("dev");
    expect(client.getInstanceUrl()).toBe("https://dev.service-now.com");
    expect(elicitInput).toHaveBeenCalledTimes(1);

    // Second resolution in the same session must not prompt again.
    await client.resolveActiveInstance();
    expect(elicitInput).toHaveBeenCalledTimes(1);
  });

  it("falls back to the default instance on decline without erroring", async () => {
    const elicitInput = vi.fn().mockResolvedValue({ action: "decline" });
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(elicitInput));

    await client.resolveActiveInstance();
    expect(client.getActiveInstanceName()).toBe("prod");
  });

  it("falls back to the default instance when the client doesn't support elicitation", async () => {
    const elicitInput = vi.fn().mockRejectedValue(new Error("Client does not support elicitation"));
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(elicitInput));

    await client.resolveActiveInstance();
    expect(client.getActiveInstanceName()).toBe("prod");
  });

  it("sn_instance_switch-equivalent: switchInstance changes the active instance without prompting", async () => {
    const elicitInput = vi.fn().mockResolvedValue({ action: "accept", content: { instance: "dev" } });
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(elicitInput));

    await client.switchInstance("dev");
    expect(client.getActiveInstanceName()).toBe("dev");

    // A later resolveActiveInstance() (e.g. the next tool call) must not
    // re-prompt or override the explicit switch.
    await client.resolveActiveInstance();
    expect(elicitInput).not.toHaveBeenCalled();
    expect(client.getActiveInstanceName()).toBe("dev");
  });

  it("switchInstance rejects an unknown instance name", async () => {
    const client = new ServiceNowClient(config(["dev", "prod"]), fakeMcpServer(vi.fn()));
    await expect(client.switchInstance("staging")).rejects.toThrow(/Unknown instance "staging"/);
  });

  it("listInstances reports every configured instance with the correct active flag", () => {
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(vi.fn()));
    expect(client.listInstances()).toEqual([
      { name: "dev", instanceUrl: "https://dev.service-now.com", authMethod: "basic", active: false },
      { name: "prod", instanceUrl: "https://prod.service-now.com", authMethod: "basic", active: true },
    ]);
  });
});
