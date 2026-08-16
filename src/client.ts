import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthMethod, InstanceConfig, ServiceNowConfig, QueryParams, PaginatedResult, BackgroundScriptResult } from "./types.js";
import { createAuthProvider, type AuthProvider } from "./auth.js";

// Printed by the elevation prelude when the background-script account
// doesn't already hold security_admin — enableElevatedRole() can only
// activate a role the account already has, never grant a new one.
export const ELEVATION_FAILED_MARKER = "__ELEVATION_FAILED__";

export class ServiceNowApiError extends Error {
  constructor(
    public statusCode: number,
    public detail: string,
    public method: string,
    public path: string
  ) {
    super(`ServiceNow API error ${statusCode} ${method} ${path}: ${detail}`);
    this.name = "ServiceNowApiError";
  }
}

export class ServiceNowClient {
  private instanceUrl: string;
  private baseUrl: string;
  private authProvider: AuthProvider;

  // The background-script tool has no REST equivalent — ServiceNow only
  // exposes it via the sys.scripts.do UI page, which needs a real form
  // login and session cookies. These fall back to SERVICENOW_USERNAME/
  // PASSWORD even when the primary authMethod is bearer/oauth.
  private backgroundScriptUsername?: string;
  private backgroundScriptPassword?: string;
  private sessionCookies: string | null = null;
  private csrfToken: string | null = null;

  private readonly instances: Record<string, InstanceConfig>;
  private activeInstanceName: string;
  // Multi-instance selection (elicitation prompt or silent single-instance
  // default) only needs to happen once per process -- after that, whatever
  // is active stays active until an explicit sn_instance_switch call.
  private instanceResolved = false;

  constructor(
    private readonly config: ServiceNowConfig,
    private readonly server: McpServer
  ) {
    this.instances = config.instances;
    this.activeInstanceName = config.defaultInstance;
    const defaultInstanceConfig = config.instances[config.defaultInstance];
    this.instanceUrl = "";
    this.baseUrl = "";
    this.authProvider = createAuthProvider(defaultInstanceConfig);
    this.applyInstance(defaultInstanceConfig, config.defaultInstance);
  }

  private applyInstance(instanceConfig: InstanceConfig, name: string): void {
    this.instanceUrl = instanceConfig.instanceUrl;
    this.baseUrl = `${instanceConfig.instanceUrl}/api/now/table`;
    this.authProvider = createAuthProvider(instanceConfig);
    this.backgroundScriptUsername = instanceConfig.username;
    this.backgroundScriptPassword = instanceConfig.password;
    // A session/CSRF token from a different instance is meaningless here.
    this.sessionCookies = null;
    this.csrfToken = null;
    this.activeInstanceName = name;
  }

  // Runs at most once per process. With a single configured instance, this
  // is a silent no-op (already applied at construction). With more than
  // one, it asks the human which to use via the MCP client's elicitation UI
  // -- on a client that doesn't support elicitation, or on decline/cancel,
  // it silently keeps whatever SERVICENOW_DEFAULT_INSTANCE (or the first
  // configured instance) already set at construction.
  private async ensureActiveInstance(): Promise<void> {
    if (this.instanceResolved) return;
    this.instanceResolved = true;

    const names = Object.keys(this.instances);
    if (names.length <= 1) return;

    try {
      const result = await this.server.server.elicitInput({
        mode: "form",
        message:
          `Multiple ServiceNow instances are configured (${names.join(", ")}). ` +
          `Which one should this session use? Defaulting to "${this.config.defaultInstance}" ` +
          "if not answered. You can switch later with sn_instance_switch.",
        requestedSchema: {
          type: "object",
          properties: {
            instance: {
              type: "string",
              title: "ServiceNow instance",
              description: "Pick which configured instance this session talks to.",
              enum: names,
              enumNames: names.map((n) => `${n} (${this.instances[n].instanceUrl})`),
              default: this.config.defaultInstance,
            },
          },
          required: ["instance"],
        },
      });

      if (result.action === "accept") {
        const chosen = result.content?.instance;
        if (typeof chosen === "string" && this.instances[chosen]) {
          this.applyInstance(this.instances[chosen], chosen);
        }
      }
      // decline/cancel -- keep the default already applied at construction.
    } catch {
      // Client doesn't support elicitation (or the request itself failed) --
      // keep the default silently rather than blocking every tool call.
    }
  }

  // Exposed for tools (e.g. sn_script_execute) that need the active
  // instance's URL for their own purposes (a confirmation prompt) before
  // making a request themselves.
  async resolveActiveInstance(): Promise<void> {
    await this.ensureActiveInstance();
  }

  getInstanceUrl(): string {
    return this.instanceUrl;
  }

  getActiveInstanceName(): string {
    return this.activeInstanceName;
  }

  listInstances(): Array<{ name: string; instanceUrl: string; authMethod: AuthMethod; active: boolean }> {
    return Object.entries(this.instances).map(([name, cfg]) => ({
      name,
      instanceUrl: cfg.instanceUrl,
      authMethod: cfg.authMethod,
      active: name === this.activeInstanceName,
    }));
  }

  async switchInstance(name: string): Promise<void> {
    const instanceConfig = this.instances[name];
    if (!instanceConfig) {
      throw new Error(
        `Unknown instance "${name}". Configured instances: ${Object.keys(this.instances).join(", ")}`
      );
    }
    this.applyInstance(instanceConfig, name);
    this.instanceResolved = true; // an explicit switch also settles selection for the session
  }

  private buildUrl(tableName: string, sysId?: string): string {
    let url = `${this.baseUrl}/${encodeURIComponent(tableName)}`;
    if (sysId) url += `/${encodeURIComponent(sysId)}`;
    return url;
  }

  private buildQueryString(params: QueryParams): string {
    const searchParams = new URLSearchParams();
    if (params.sysparm_query) searchParams.set("sysparm_query", params.sysparm_query);
    if (params.sysparm_fields) searchParams.set("sysparm_fields", params.sysparm_fields);
    if (params.sysparm_limit !== undefined)
      searchParams.set("sysparm_limit", String(params.sysparm_limit));
    if (params.sysparm_offset !== undefined)
      searchParams.set("sysparm_offset", String(params.sysparm_offset));
    if (params.sysparm_display_value)
      searchParams.set("sysparm_display_value", params.sysparm_display_value);
    const qs = searchParams.toString();
    return qs ? `?${qs}` : "";
  }

  // Callers must resolve the active instance (via ensureActiveInstance())
  // themselves before building a URL from this.baseUrl/this.instanceUrl --
  // by the time a URL string reaches this method it's too late to redirect
  // it to a different instance's host.
  private async request<T>(
    method: string,
    url: string,
    body?: Record<string, unknown>,
    isRetry = false
  ): Promise<{ data: T; totalCount?: number }> {
    const headers: Record<string, string> = {
      Authorization: await this.authProvider.getAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 && !isRetry) {
      // Token may have expired between our cached-expiry check and the
      // request landing — refresh once and retry before giving up.
      await this.authProvider.onUnauthorized();
      return this.request<T>(method, url, body, true);
    }

    if (!response.ok) {
      let detail: string;
      try {
        const errBody = (await response.json()) as { error?: { message?: string; detail?: string } };
        detail = errBody?.error?.message || errBody?.error?.detail || response.statusText;
      } catch {
        detail = response.statusText;
      }
      throw new ServiceNowApiError(
        response.status,
        detail,
        method,
        url.replace(this.baseUrl, "")
      );
    }

    const totalCountHeader = response.headers.get("X-Total-Count");
    const totalCount = totalCountHeader ? parseInt(totalCountHeader, 10) : undefined;

    // DELETE returns 204 No Content
    if (response.status === 204) {
      return { data: {} as T, totalCount };
    }

    const data = (await response.json()) as T;
    return { data, totalCount };
  }

  async query<T = Record<string, unknown>>(
    tableName: string,
    params: QueryParams = {}
  ): Promise<PaginatedResult<T>> {
    await this.ensureActiveInstance();
    const limit = params.sysparm_limit ?? 20;
    const offset = params.sysparm_offset ?? 0;
    const url =
      this.buildUrl(tableName) +
      this.buildQueryString({ ...params, sysparm_limit: limit, sysparm_offset: offset });

    const { data, totalCount } = await this.request<{ result: T[] }>("GET", url);
    return {
      records: data.result,
      totalCount: totalCount ?? data.result.length,
      limit,
      offset,
    };
  }

  async getById<T = Record<string, unknown>>(
    tableName: string,
    sysId: string,
    fields?: string
  ): Promise<T> {
    await this.ensureActiveInstance();
    const params: QueryParams = {};
    if (fields) params.sysparm_fields = fields;
    const url = this.buildUrl(tableName, sysId) + this.buildQueryString(params);
    const { data } = await this.request<{ result: T }>("GET", url);
    return data.result;
  }

  async create<T = Record<string, unknown>>(
    tableName: string,
    body: Record<string, unknown>
  ): Promise<T> {
    await this.ensureActiveInstance();
    const url = this.buildUrl(tableName);
    const { data } = await this.request<{ result: T }>("POST", url, body);
    return data.result;
  }

  async update<T = Record<string, unknown>>(
    tableName: string,
    sysId: string,
    body: Record<string, unknown>
  ): Promise<T> {
    await this.ensureActiveInstance();
    const url = this.buildUrl(tableName, sysId);
    const { data } = await this.request<{ result: T }>("PATCH", url, body);
    return data.result;
  }

  async delete(tableName: string, sysId: string): Promise<void> {
    await this.ensureActiveInstance();
    const url = this.buildUrl(tableName, sysId);
    await this.request("DELETE", url);
  }

  async aggregate(
    tableName: string,
    params: {
      sysparm_query?: string;
      sysparm_group_by?: string;
      sysparm_count?: boolean;
      sysparm_avg_fields?: string;
      sysparm_sum_fields?: string;
      sysparm_min_fields?: string;
      sysparm_max_fields?: string;
    }
  ): Promise<Record<string, unknown>[]> {
    await this.ensureActiveInstance();
    const searchParams = new URLSearchParams();
    if (params.sysparm_query) searchParams.set("sysparm_query", params.sysparm_query);
    if (params.sysparm_group_by) searchParams.set("sysparm_group_by", params.sysparm_group_by);
    if (params.sysparm_count) searchParams.set("sysparm_count", "true");
    if (params.sysparm_avg_fields) searchParams.set("sysparm_avg_fields", params.sysparm_avg_fields);
    if (params.sysparm_sum_fields) searchParams.set("sysparm_sum_fields", params.sysparm_sum_fields);
    if (params.sysparm_min_fields) searchParams.set("sysparm_min_fields", params.sysparm_min_fields);
    if (params.sysparm_max_fields) searchParams.set("sysparm_max_fields", params.sysparm_max_fields);
    const qs = searchParams.toString();
    const url = `${this.instanceUrl}/api/now/stats/${tableName}${qs ? `?${qs}` : ""}`;
    const { data } = await this.request<{ result: Record<string, unknown>[] }>("GET", url);
    return data.result;
  }

  async restApi<T = Record<string, unknown>>(
    method: string,
    apiPath: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    await this.ensureActiveInstance();
    const url = `${this.instanceUrl}${apiPath}`;
    const { data } = await this.request<T>(method, url, body);
    return data;
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionCookies && this.csrfToken) return;

    if (!this.backgroundScriptUsername || !this.backgroundScriptPassword) {
      throw new Error(
        "Background script execution requires SERVICENOW_USERNAME and SERVICENOW_PASSWORD to be set. " +
          "This tool logs in via ServiceNow's UI form (sys.scripts.do) — there is no REST/OAuth/bearer-token " +
          "equivalent, so a real username/password is needed even when SERVICENOW_AUTH_METHOD is bearer or oauth."
      );
    }

    // Login via form POST to get an authenticated session
    const loginForm = new URLSearchParams();
    loginForm.set("user_name", this.backgroundScriptUsername);
    loginForm.set("user_password", this.backgroundScriptPassword);
    loginForm.set("sys_action", "sysverb_login");

    const loginResp = await fetch(`${this.instanceUrl}/login.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: loginForm.toString(),
      redirect: "manual",
    });

    // A 3xx redirect here (instead of Set-Cookie'd 200/302-to-home) means
    // login.do didn't complete the session -- most commonly because the
    // account now has Multi-Factor Authentication enforced, which redirects
    // to validate_multifactor_auth_code.do and can't be completed headlessly
    // (there's no REST/API equivalent to submit the MFA code). Surface this
    // distinctly instead of failing later with an opaque "no CSRF token".
    const loginLocation = loginResp.headers.get("location");
    if (loginResp.status >= 300 && loginResp.status < 400 && loginLocation?.includes("multifactor_auth")) {
      throw new Error(
        `Background script execution failed: SERVICENOW_USERNAME requires Multi-Factor Authentication ` +
          `(login.do redirected to ${loginLocation}), which this headless login flow cannot complete. ` +
          `Either exclude this account from MFA enforcement on the instance (recommended: use a dedicated ` +
          `integration account excluded from MFA, not a personal/admin account), or disable ` +
          `SERVICENOW_ENABLE_SCRIPT_EXECUTE -- all other tools use the Table/REST API and are unaffected.`
      );
    }

    const loginCookies = loginResp.headers.getSetCookie();

    // Load the background scripts page to get CSRF token
    const cookieStr = loginCookies.map((c) => c.split(";")[0]).join("; ");
    const pageResp = await fetch(`${this.instanceUrl}/sys.scripts.do`, {
      headers: { Cookie: cookieStr },
    });
    const pageBody = await pageResp.text();
    const pageCookies = pageResp.headers.getSetCookie();

    // Merge and deduplicate cookies
    const allCookies = [...loginCookies, ...pageCookies].map((c) => c.split(";")[0]);
    const cookieMap: Record<string, string> = {};
    for (const c of allCookies) {
      const [name] = c.split("=");
      cookieMap[name] = c;
    }
    this.sessionCookies = Object.values(cookieMap).join("; ");

    // Extract CSRF token from hidden form field
    const ckMatch = pageBody.match(/name="sysparm_ck"[^>]*value="([^"]+)"/);
    if (!ckMatch) {
      throw new Error("Failed to obtain CSRF token from background scripts page");
    }
    this.csrfToken = ckMatch[1];
  }

  // Uses GlideSecurityManager.enableElevatedRole() — an undocumented,
  // unsupported ServiceNow internal API (no official REST/scripted
  // equivalent exists for the "Elevate Roles" UI action). It only
  // *activates* a role the session's user already holds; it cannot
  // grant security_admin to an account that doesn't have it, and it
  // never impersonates another user to get around that. If the
  // background-script account lacks the role, we fail loudly via the
  // marker below rather than silently running unelevated.
  private wrapWithElevation(script: string): string {
    return [
      "if (!gs.hasRole('security_admin')) {",
      `  gs.print('${ELEVATION_FAILED_MARKER} the background-script account does not have the security_admin role assigned. GlideSecurityManager.enableElevatedRole() can only activate a role the account already holds -- assign security_admin to this account directly, it cannot be granted programmatically.');`,
      "} else {",
      "  GlideSecurityManager.get().enableElevatedRole('security_admin');",
      "  (function() {",
      script,
      "  })();",
      "}",
    ].join("\n");
  }

  async executeBackgroundScript(
    script: string,
    scope: string = "global",
    elevateSecurityAdmin = false
  ): Promise<BackgroundScriptResult> {
    await this.ensureActiveInstance();
    await this.ensureSession();

    const effectiveScript = elevateSecurityAdmin
      ? this.wrapWithElevation(script)
      : script;

    const formData = new URLSearchParams();
    formData.set("script", effectiveScript);
    formData.set("runscript", "Run script");
    formData.set("sys_scope", scope);
    formData.set("quota_managed_transaction", "on");
    formData.set("record_for_rollback", "on");
    formData.set("sysparm_ck", this.csrfToken!);

    const resp = await fetch(`${this.instanceUrl}/sys.scripts.do`, {
      method: "POST",
      headers: {
        Cookie: this.sessionCookies!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!resp.ok) {
      // Session may have expired — reset and retry once
      this.sessionCookies = null;
      this.csrfToken = null;
      await this.ensureSession();

      formData.set("sysparm_ck", this.csrfToken!);
      const retryResp = await fetch(`${this.instanceUrl}/sys.scripts.do`, {
        method: "POST",
        headers: {
          Cookie: this.sessionCookies!,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!retryResp.ok) {
        throw new Error(`Background script execution failed with status ${retryResp.status}`);
      }

      return this.parseBackgroundScriptOutput(await retryResp.text());
    }

    return this.parseBackgroundScriptOutput(await resp.text());
  }

  async attachmentQuery(
    tableName: string,
    tableSysId?: string,
    params: { sysparm_limit?: number; sysparm_offset?: number } = {}
  ): Promise<{ records: Record<string, unknown>[]; totalCount: number }> {
    await this.ensureActiveInstance();
    const searchParams = new URLSearchParams();
    const queryParts: string[] = [];
    if (tableName) queryParts.push(`table_name=${tableName}`);
    if (tableSysId) queryParts.push(`table_sys_id=${tableSysId}`);
    if (queryParts.length) searchParams.set("sysparm_query", queryParts.join("^"));
    if (params.sysparm_limit !== undefined) searchParams.set("sysparm_limit", String(params.sysparm_limit));
    if (params.sysparm_offset !== undefined) searchParams.set("sysparm_offset", String(params.sysparm_offset));
    const qs = searchParams.toString();
    const url = `${this.instanceUrl}/api/now/attachment${qs ? `?${qs}` : ""}`;
    const { data, totalCount } = await this.request<{ result: Record<string, unknown>[] }>("GET", url);
    return { records: data.result, totalCount: totalCount ?? data.result.length };
  }

  async attachmentGetById(sysId: string): Promise<Record<string, unknown>> {
    await this.ensureActiveInstance();
    const url = `${this.instanceUrl}/api/now/attachment/${encodeURIComponent(sysId)}`;
    const { data } = await this.request<{ result: Record<string, unknown> }>("GET", url);
    return data.result;
  }

  async attachmentDelete(sysId: string): Promise<void> {
    await this.ensureActiveInstance();
    const url = `${this.instanceUrl}/api/now/attachment/${encodeURIComponent(sysId)}`;
    await this.request("DELETE", url);
  }

  async batchRequest(
    requests: Array<{ id: string; url: string; method: string; body?: Record<string, unknown>; headers?: Array<{ name: string; value: string }> }>
  ): Promise<Record<string, unknown>> {
    await this.ensureActiveInstance();
    const url = `${this.instanceUrl}/api/now/v1/batch`;
    const payload = {
      batch_request_id: Date.now().toString(),
      rest_requests: requests.map((r) => ({
        id: r.id,
        url: r.url,
        method: r.method,
        headers: r.headers ?? [{ name: "Content-Type", value: "application/json" }],
        ...(r.body ? { body: Buffer.from(JSON.stringify(r.body)).toString("base64") } : {}),
        exclude_response_headers: true,
      })),
    };
    const { data } = await this.request<Record<string, unknown>>("POST", url, payload as unknown as Record<string, unknown>);
    return data;
  }

  private parseBackgroundScriptOutput(html: string): BackgroundScriptResult {
    const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/i);
    if (!preMatch) {
      return { success: true, output: "" };
    }

    const raw = preMatch[1];

    // Check for script compilation errors
    if (raw.includes("Script compilation error") || raw.includes("Javascript compiler exception")) {
      const errorDesc = raw.match(/Error Description: ([^,]+)/)?.[1]
        ?? raw.match(/Javascript compiler exception: ([^\n<]+)/)?.[1]
        ?? "Script compilation error";
      return { success: false, output: "", error: errorDesc.trim() };
    }

    // Clean HTML artifacts from output
    const output = raw
      .replace(/<BR\/>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\*\*\* Script: /g, "")
      .trim();

    return { success: true, output };
  }
}
