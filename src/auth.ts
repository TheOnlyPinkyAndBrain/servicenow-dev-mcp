import type { ServiceNowConfig } from "./types.js";

// Refresh this many seconds before actual expiry to avoid racing a
// request against a token that dies mid-flight.
const EXPIRY_SAFETY_MARGIN_SECONDS = 60;

export interface AuthProvider {
  /** Returns the current `Authorization` header value, fetching/refreshing as needed. */
  getAuthHeader(): Promise<string>;
  /** Called after a request comes back 401, to force a token refresh before the single retry. */
  onUnauthorized(): Promise<void>;
}

class BasicAuthProvider implements AuthProvider {
  private readonly header: string;

  constructor(username: string, password: string) {
    this.header = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
  }

  async getAuthHeader(): Promise<string> {
    return this.header;
  }

  async onUnauthorized(): Promise<void> {
    // Static credentials — nothing to refresh. A 401 here means the
    // username/password itself is wrong or the account is locked.
  }
}

class BearerTokenAuthProvider implements AuthProvider {
  constructor(private readonly token: string) {}

  async getAuthHeader(): Promise<string> {
    return `Bearer ${this.token}`;
  }

  async onUnauthorized(): Promise<void> {
    // Static token — the caller is responsible for rotating
    // SERVICENOW_ACCESS_TOKEN and restarting the server.
  }
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

class OAuthAuthProvider implements AuthProvider {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt = 0;
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly opts: {
      instanceUrl: string;
      clientId: string;
      clientSecret: string;
      grantType: "password" | "client_credentials";
      username?: string;
      password?: string;
    }
  ) {
    if (opts.grantType === "password" && (!opts.username || !opts.password)) {
      throw new Error(
        "SERVICENOW_OAUTH_USERNAME and SERVICENOW_OAUTH_PASSWORD are required when SERVICENOW_OAUTH_GRANT_TYPE=password"
      );
    }
  }

  async getAuthHeader(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      await this.fetchToken(false);
    }
    return `Bearer ${this.accessToken}`;
  }

  async onUnauthorized(): Promise<void> {
    await this.fetchToken(true);
  }

  private fetchToken(forceFreshGrant: boolean): Promise<void> {
    // Coalesce concurrent refreshes triggered by parallel tool calls.
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.doFetchToken(forceFreshGrant).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async doFetchToken(forceFreshGrant: boolean): Promise<void> {
    const body = new URLSearchParams();
    body.set("client_id", this.opts.clientId);
    body.set("client_secret", this.opts.clientSecret);

    if (!forceFreshGrant && this.refreshToken) {
      body.set("grant_type", "refresh_token");
      body.set("refresh_token", this.refreshToken);
    } else if (this.opts.grantType === "client_credentials") {
      body.set("grant_type", "client_credentials");
    } else {
      body.set("grant_type", "password");
      body.set("username", this.opts.username!);
      body.set("password", this.opts.password!);
    }

    const resp = await fetch(`${this.opts.instanceUrl}/oauth_token.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!resp.ok) {
      // A stale/revoked refresh token should fall back to a fresh grant once,
      // rather than surfacing a confusing error for what's really just token rot.
      if (!forceFreshGrant && this.refreshToken) {
        this.refreshToken = null;
        return this.doFetchToken(true);
      }
      const detail = await resp.text().catch(() => resp.statusText);
      throw new Error(`ServiceNow OAuth token request failed (${resp.status}): ${detail}`);
    }

    const data = (await resp.json()) as OAuthTokenResponse;
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token ?? this.refreshToken;
    this.expiresAt = Date.now() + Math.max(data.expires_in - EXPIRY_SAFETY_MARGIN_SECONDS, 0) * 1000;
  }
}

export function createAuthProvider(config: ServiceNowConfig): AuthProvider {
  switch (config.authMethod) {
    case "bearer":
      return new BearerTokenAuthProvider(config.accessToken!);
    case "oauth":
      return new OAuthAuthProvider({
        instanceUrl: config.instanceUrl,
        clientId: config.oauthClientId!,
        clientSecret: config.oauthClientSecret!,
        grantType: config.oauthGrantType ?? "password",
        username: config.oauthUsername,
        password: config.oauthPassword,
      });
    case "basic":
    default:
      return new BasicAuthProvider(config.username!, config.password!);
  }
}
