import { ELEVATION_FAILED_MARKER, ServiceNowApiError, type ServiceNowClient } from "./client.js";

export function errorResult(error: unknown) {
  const message =
    error instanceof ServiceNowApiError
      ? `ServiceNow API Error (${error.statusCode}): ${error.detail}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

export function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

export function buildQuery(parts: string[]): string {
  return parts.filter(Boolean).join("^");
}

// For writes to tables ServiceNow itself refuses without an active
// security_admin elevation (e.g. sys_security_acl) — there's no REST path
// that can carry a session's elevated flag, so these always go through the
// background-script engine with elevation forced on, rather than the plain
// Table API used by every other create/update tool in this server.
export async function runElevatedGlideRecordWrite(
  client: ServiceNowClient,
  script: string
): Promise<{ isError?: true; content: { type: "text"; text: string }[] }> {
  const result = await client.executeBackgroundScript(script, "global", true);

  if (!result.success) {
    return errorResult(new Error(result.error ?? "Script execution failed"));
  }
  if (!result.output || result.output.includes(ELEVATION_FAILED_MARKER)) {
    return errorResult(
      new Error(
        result.output || "Write produced no output — the account may lack security_admin."
      )
    );
  }
  try {
    const parsed = JSON.parse(result.output) as { error?: boolean; message?: string };
    if (parsed.error) {
      return errorResult(new Error(parsed.message ?? "Elevated write failed"));
    }
    return jsonResult(parsed);
  } catch {
    return errorResult(new Error(result.output));
  }
}
