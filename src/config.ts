import { z } from "zod";
import dotenv from "dotenv";
import type { ServiceNowConfig } from "./types.js";

dotenv.config({ path: process.env.SERVICENOW_ENV_FILE || ".env" });

const configSchema = z
  .object({
    SERVICENOW_INSTANCE_URL: z
      .string()
      .url("SERVICENOW_INSTANCE_URL must be a valid URL")
      .refine((url) => !url.endsWith("/"), {
        message: "SERVICENOW_INSTANCE_URL must not end with a trailing slash",
      }),
    SERVICENOW_MODE: z.enum(["debug", "develop"]).default("debug"),

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

export function loadConfig(): ServiceNowConfig {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`Configuration error:\n${errors}`);
    process.exit(1);
  }

  const data = result.data;

  return {
    instanceUrl: data.SERVICENOW_INSTANCE_URL,
    mode: data.SERVICENOW_MODE,
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
