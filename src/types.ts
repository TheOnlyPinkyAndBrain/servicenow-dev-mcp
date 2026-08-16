import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServiceNowClient } from "./client.js";

export type Mode = "debug" | "develop";

export type AuthMethod = "basic" | "bearer" | "oauth";

export type OAuthGrantType = "password" | "client_credentials";

export interface ServiceNowConfig {
  instanceUrl: string;
  mode: Mode;
  authMethod: AuthMethod;

  // Basic auth — also used as the fallback session login for the
  // background-script tool, which has no REST equivalent and always
  // requires a real username/password form login regardless of authMethod.
  username?: string;
  password?: string;

  // Bearer token auth (static token, caller manages rotation)
  accessToken?: string;

  // OAuth (ServiceNow's own /oauth_token.do token endpoint)
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthGrantType?: OAuthGrantType;
  oauthUsername?: string;
  oauthPassword?: string;

  // Opt-in gate for sn_script_execute/sn_script_execute_query, separate from
  // and in addition to mode === "develop".
  enableScriptExecute: boolean;
}

export interface QueryParams {
  sysparm_query?: string;
  sysparm_fields?: string;
  sysparm_limit?: number;
  sysparm_offset?: number;
  sysparm_display_value?: "true" | "false" | "all";
}

export interface TableResponse<T = Record<string, unknown>> {
  result: T | T[];
}

export interface PaginatedResult<T = Record<string, unknown>> {
  records: T[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface BackgroundScriptResult {
  success: boolean;
  output: string;
  error?: string;
}

export type RegisterTools = (
  server: McpServer,
  client: ServiceNowClient,
  mode: Mode
) => void;
