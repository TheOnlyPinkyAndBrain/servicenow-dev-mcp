import { z } from "zod";
import { config as loadDotenvx } from "@dotenvx/dotenvx";
import type { InstanceConfig, ServiceNowConfig } from "./types.js";

// dotenvx transparently decrypts values encrypted via `npx dotenvx encrypt`
// (see .gitignore -- .env.keys holds the private key, never committed) while
// still reading plain unencrypted values the same way `dotenv` always did.
loadDotenvx({ path: [process.env.SERVICENOW_ENV_FILE || ".env"] });

const DEFAULT_INSTANCE_NAME = "default";

// Per-instance fields, independent of which env var names they're read from
// (single-instance mode reads the bare names below; multi-instance mode
// reads SERVICENOW_INSTANCE_<NAME>_* -- see readInstanceEnv).
const instanceEnvSchema = z
  .object({
    SERVICENOW_INSTANCE_URL: z
      .string()
      .url("must be a valid URL")
      .refine((url) => !url.endsWith("/"), {
        message: "must not end with a trailing slash",
      })
      .refine(
        (url) =>
          url.startsWith("https://") ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url),
        {
          // Basic auth sends credentials as a base64 Authorization header, and
          // OAuth/bearer tokens go over the same connection -- http:// would put
          // all of that on the wire in the clear. localhost/127.0.0.1 is exempt
          // since that traffic never leaves the machine (e.g. a local dev proxy).
          message:
            "must use https:// (plaintext http:// would send credentials unencrypted); http://localhost is allowed for local dev proxies only",
        }
      ),
    SERVICENOW_AUTH_METHOD: z.enum(["basic", "bearer", "oauth"]).default("basic"),

    // Basic auth (also the fallback for the background-script tool's session login)
    SERVICENOW_USERNAME: z.string().optional(),
    SERVICENOW_PASSWORD: z.string().optional(),

    // Bearer token auth
    SERVICENOW_ACCESS_TOKEN: z.string().optional(),

    // OAuth auth
    SERVICENOW_OAUTH_CLIENT_ID: z.string().optional(),
    SERVICENOW_OAUTH_CLIENT_SECRET: z.string().optional(),
    SERVICENOW_OAUTH_GRANT_TYPE: z.enum(["password", "client_credentials"]).default("password"),
    SERVICENOW_OAUTH_USERNAME: z.string().optional(),
    SERVICENOW_OAUTH_PASSWORD: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const require = (field: keyof typeof data, message: string) => {
      if (!data[field]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
    };

    if (data.SERVICENOW_AUTH_METHOD === "basic") {
      require("SERVICENOW_USERNAME", "required when SERVICENOW_AUTH_METHOD=basic");
      require("SERVICENOW_PASSWORD", "required when SERVICENOW_AUTH_METHOD=basic");
    } else if (data.SERVICENOW_AUTH_METHOD === "bearer") {
      require("SERVICENOW_ACCESS_TOKEN", "required when SERVICENOW_AUTH_METHOD=bearer");
    } else if (data.SERVICENOW_AUTH_METHOD === "oauth") {
      require("SERVICENOW_OAUTH_CLIENT_ID", "required when SERVICENOW_AUTH_METHOD=oauth");
      require("SERVICENOW_OAUTH_CLIENT_SECRET", "required when SERVICENOW_AUTH_METHOD=oauth");
      if (data.SERVICENOW_OAUTH_GRANT_TYPE === "password") {
        require("SERVICENOW_OAUTH_USERNAME", "required when SERVICENOW_OAUTH_GRANT_TYPE=password");
        require("SERVICENOW_OAUTH_PASSWORD", "required when SERVICENOW_OAUTH_GRANT_TYPE=password");
      }
    }
  });

const globalEnvSchema = z.object({
  SERVICENOW_MODE: z.enum(["debug", "develop"]).default("debug"),

  // Comma-separated instance names, e.g. "dev,prod". Each name must be an
  // env-var-safe identifier since it's used to build SERVICENOW_INSTANCE_
  // <NAME>_* var names below. Unset = single-instance mode, reading the
  // bare (unprefixed) SERVICENOW_INSTANCE_URL / SERVICENOW_USERNAME / etc.
  SERVICENOW_INSTANCES: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined
    )
    .refine(
      (names) => !names || names.every((n) => /^[A-Za-z][A-Za-z0-9_]*$/.test(n)),
      "each name in SERVICENOW_INSTANCES must start with a letter and contain only letters, digits, and underscores (it's used to build SERVICENOW_INSTANCE_<NAME>_* env var names)"
    ),

  // Picks which instance is active before anything has explicitly selected
  // one for this session (e.g. a client that doesn't support elicitation).
  // Defaults to the first name in SERVICENOW_INSTANCES / the sole instance.
  SERVICENOW_DEFAULT_INSTANCE: z.string().optional(),

  // Separate opt-in on top of SERVICENOW_MODE=develop, required for
  // sn_script_execute/sn_script_execute_query. These run arbitrary
  // server-side JS (optionally self-elevated to security_admin) -- the
  // highest-impact tools in this server. Off by default so enabling
  // develop mode for ordinary CRUD work doesn't silently also expose this.
  // Applies to whichever instance is active -- it is not per-instance.
  SERVICENOW_ENABLE_SCRIPT_EXECUTE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

// Builds the env-var-name -> value map instanceEnvSchema expects, reading
// either the bare names (prefix === null, single-instance mode) or the
// SERVICENOW_INSTANCE_<NAME>_* names (multi-instance mode).
function readInstanceEnv(prefix: string | null): Record<string, string | undefined> {
  const key = (suffix: string) =>
    prefix ? `SERVICENOW_INSTANCE_${prefix}_${suffix}` : `SERVICENOW_${suffix === "URL" ? "INSTANCE_URL" : suffix}`;

  return {
    SERVICENOW_INSTANCE_URL: process.env[key("URL")],
    SERVICENOW_AUTH_METHOD: process.env[key("AUTH_METHOD")],
    SERVICENOW_USERNAME: process.env[key("USERNAME")],
    SERVICENOW_PASSWORD: process.env[key("PASSWORD")],
    SERVICENOW_ACCESS_TOKEN: process.env[key("ACCESS_TOKEN")],
    SERVICENOW_OAUTH_CLIENT_ID: process.env[key("OAUTH_CLIENT_ID")],
    SERVICENOW_OAUTH_CLIENT_SECRET: process.env[key("OAUTH_CLIENT_SECRET")],
    SERVICENOW_OAUTH_GRANT_TYPE: process.env[key("OAUTH_GRANT_TYPE")],
    SERVICENOW_OAUTH_USERNAME: process.env[key("OAUTH_USERNAME")],
    SERVICENOW_OAUTH_PASSWORD: process.env[key("OAUTH_PASSWORD")],
  };
}

function toInstanceConfig(data: z.infer<typeof instanceEnvSchema>): InstanceConfig {
  return {
    instanceUrl: data.SERVICENOW_INSTANCE_URL,
    authMethod: data.SERVICENOW_AUTH_METHOD,
    username: data.SERVICENOW_USERNAME,
    password: data.SERVICENOW_PASSWORD,
    accessToken: data.SERVICENOW_ACCESS_TOKEN,
    oauthClientId: data.SERVICENOW_OAUTH_CLIENT_ID,
    oauthClientSecret: data.SERVICENOW_OAUTH_CLIENT_SECRET,
    oauthGrantType: data.SERVICENOW_OAUTH_GRANT_TYPE,
    oauthUsername: data.SERVICENOW_OAUTH_USERNAME,
    oauthPassword: data.SERVICENOW_OAUTH_PASSWORD,
  };
}

export function loadConfig(): ServiceNowConfig {
  const globalResult = globalEnvSchema.safeParse(process.env);
  if (!globalResult.success) {
    const errors = globalResult.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`Configuration error:\n${errors}`);
    process.exit(1);
  }
  const global = globalResult.data;

  const names = global.SERVICENOW_INSTANCES ?? [DEFAULT_INSTANCE_NAME];
  const instances: Record<string, InstanceConfig> = {};
  const allErrors: string[] = [];

  for (const name of names) {
    const prefix = global.SERVICENOW_INSTANCES ? name.toUpperCase() : null;
    const result = instanceEnvSchema.safeParse(readInstanceEnv(prefix));
    if (!result.success) {
      for (const issue of result.error.issues) {
        allErrors.push(`  - [${name}] ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }
    instances[name] = toInstanceConfig(result.data);
  }

  if (allErrors.length > 0) {
    console.error(`Configuration error:\n${allErrors.join("\n")}`);
    process.exit(1);
  }

  const defaultInstance = global.SERVICENOW_DEFAULT_INSTANCE ?? names[0];
  if (!instances[defaultInstance]) {
    console.error(
      `Configuration error:\n  - SERVICENOW_DEFAULT_INSTANCE: "${defaultInstance}" is not one of the configured instances (${names.join(", ")})`
    );
    process.exit(1);
  }

  return {
    instances,
    defaultInstance,
    mode: global.SERVICENOW_MODE,
    enableScriptExecute: global.SERVICENOW_ENABLE_SCRIPT_EXECUTE,
  };
}
