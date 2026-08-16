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

// A minimal stand-in for McpServer -- only the elicitInput/sendLoggingMessage
// surface ServiceNowClient actually calls.
function fakeMcpServer(
  elicitInput: (...args: unknown[]) => unknown,
  sendLoggingMessage: (...args: unknown[]) => unknown = vi.fn().mockResolvedValue(undefined)
) {
  return {
    server: { elicitInput },
    sendLoggingMessage,
  } as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer;
}

describe("single-instance config (still prompts -- 'add another instance' is always on offer)", () => {
  it("prompts even with one instance configured, and accepting it keeps it active", async () => {
    const elicitInput = vi.fn().mockResolvedValue({ action: "accept", content: { instance: "default" } });
    const client = new ServiceNowClient(config(["default"]), fakeMcpServer(elicitInput));

    await client.resolveActiveInstance();
    expect(elicitInput).toHaveBeenCalledTimes(1);
    expect(client.getActiveInstanceName()).toBe("default");
    expect(client.listInstances()).toEqual([
      { name: "default", instanceUrl: "https://default.service-now.com", authMethod: "basic", active: true },
    ]);

    // Resolved once per process -- a later call must not prompt again.
    await client.resolveActiveInstance();
    expect(elicitInput).toHaveBeenCalledTimes(1);
  });

  it("falls back to the sole instance on decline or when elicitation isn't supported", async () => {
    const declineClient = new ServiceNowClient(
      config(["default"]),
      fakeMcpServer(vi.fn().mockResolvedValue({ action: "decline" }))
    );
    await declineClient.resolveActiveInstance();
    expect(declineClient.getActiveInstanceName()).toBe("default");

    const unsupportedClient = new ServiceNowClient(
      config(["default"]),
      fakeMcpServer(vi.fn().mockRejectedValue(new Error("Client does not support elicitation")))
    );
    await unsupportedClient.resolveActiveInstance();
    expect(unsupportedClient.getActiveInstanceName()).toBe("default");
  });
});

describe("adding a new instance from the picker", () => {
  it("keeps the current instance active and sends setup instructions instead of collecting credentials", async () => {
    const elicitInput = vi.fn().mockResolvedValue({ action: "accept", content: { instance: "__add_new_instance__" } });
    const sendLoggingMessage = vi.fn().mockResolvedValue(undefined);
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(elicitInput, sendLoggingMessage));

    await client.resolveActiveInstance();

    expect(client.getActiveInstanceName()).toBe("prod");
    expect(sendLoggingMessage).toHaveBeenCalledTimes(1);
    const [params] = sendLoggingMessage.mock.calls[0] as [{ level: string; data: string }];
    expect(params.level).toBe("info");
    expect(params.data).toMatch(/npm run setup/);
    expect(params.data).toMatch(/"prod"/);
  });

  it("doesn't throw when the client doesn't support logging notifications", async () => {
    const elicitInput = vi.fn().mockResolvedValue({ action: "accept", content: { instance: "__add_new_instance__" } });
    const sendLoggingMessage = vi.fn().mockRejectedValue(new Error("logging not supported"));
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(elicitInput, sendLoggingMessage));

    await expect(client.resolveActiveInstance()).resolves.toBeUndefined();
    expect(client.getActiveInstanceName()).toBe("prod");
  });

  it("offers the add-new-instance option in the elicitation schema alongside every configured name", async () => {
    const elicitInput = vi.fn().mockResolvedValue({ action: "decline" });
    const client = new ServiceNowClient(config(["dev", "prod"], "prod"), fakeMcpServer(elicitInput));

    await client.resolveActiveInstance();

    const request = elicitInput.mock.calls[0][0] as {
      requestedSchema: { properties: { instance: { enum: string[] } } };
    };
    expect(request.requestedSchema.properties.instance.enum).toEqual(["dev", "prod", "__add_new_instance__"]);
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
