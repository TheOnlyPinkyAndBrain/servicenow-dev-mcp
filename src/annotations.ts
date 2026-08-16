import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * Standard MCP tool annotation sets, applied as the 5th argument to
 * `server.tool(name, description, schema, annotations, handler)`.
 *
 * Every tool talks to an external ServiceNow instance, so `openWorldHint` is
 * always true. The other hints follow the tool's effect:
 *  - READ    — safe, no side effects
 *  - CREATE  — adds a record (not destructive, not idempotent — each call is new)
 *  - UPDATE  — modifies an existing record (destructive overwrite; idempotent)
 *  - DELETE  — removes a record (destructive; idempotent)
 *  - ACTION  — side-effecting but non-destructive and idempotent (e.g. recompute)
 *
 * Per the MCP spec these are hints only — clients must not rely on them for
 * security, but they let clients surface safe vs. mutating tools.
 */
export const READ: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: true,
};

export const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

export const UPDATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};

export const DELETE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};

export const ACTION: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

// Runs arbitrary server-side script / batch of requests — can modify anything
// and is not idempotent (e.g. background script execution, batch REST).
export const EXECUTE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};
