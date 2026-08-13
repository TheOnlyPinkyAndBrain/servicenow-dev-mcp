#!/usr/bin/env node
// Interactive credential/auth-method setup for the ServiceNow MCP server.
// Stands in for the "config page" a hosted connector would have: there's no
// such UI for a locally-spawned MCP server, so this is the practical
// equivalent -- prompts for the fields the chosen auth method needs, and
// writes them through `dotenvx set` so .env stays encrypted at rest.

import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config as loadDotenvx } from "@dotenvx/dotenvx";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Call the locally installed binary directly rather than going through npx --
// npx can itself touch stdin (e.g. install-confirmation prompts), which
// silently steals lines meant for our own prompts below.
const DOTENVX_BIN = join(__dirname, "..", "node_modules", ".bin", "dotenvx");
const ENV_FILE = process.env.SERVICENOW_ENV_FILE || ".env";

if (!existsSync(ENV_FILE)) {
  console.error(`${ENV_FILE} not found. Copy .env.example to ${ENV_FILE} first:\n  cp .env.example ${ENV_FILE}`);
  process.exit(1);
}

// Load current (decrypted) values into process.env, so prompts can default
// to what's already set -- secrets are never echoed back, only used to know
// whether a value already exists.
loadDotenvx({ path: [ENV_FILE], overload: true });

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

// Masks typed input by suppressing readline's terminal echo while a
// question is pending, rather than reimplementing raw-mode key handling --
// readline still does all the real work (backspace, line buffering).
function askSecret(question, hasExisting) {
  const suffix = hasExisting ? " [leave blank to keep current]" : "";
  return new Promise((resolve) => {
    const originalWrite = rl._writeToOutput?.bind(rl);
    let muted = false;
    if (originalWrite) {
      rl._writeToOutput = (chunk) => {
        if (!muted) originalWrite(chunk);
      };
    }
    rl.question(`${question}${suffix}: `, (answer) => {
      if (originalWrite) rl._writeToOutput = originalWrite;
      process.stdout.write("\n");
      resolve(answer.trim());
    });
    muted = true;
  });
}

function setVar(key, value, { plain = false } = {}) {
  if (!value) return; // blank = keep whatever's already in .env untouched
  const args = ["set", key, value, "-f", ENV_FILE];
  if (plain) args.push("-p");
  const result = spawnSync(DOTENVX_BIN, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (result.status !== 0) {
    throw new Error(`Failed to set ${key} (dotenvx exited ${result.status})`);
  }
}

async function main() {
  console.log("ServiceNow MCP setup\n");

  const instanceUrl = await ask("ServiceNow instance URL", process.env.SERVICENOW_INSTANCE_URL);
  setVar("SERVICENOW_INSTANCE_URL", instanceUrl, { plain: true });

  const mode = await ask("Mode: debug (read-only) or develop (read-write)", process.env.SERVICENOW_MODE || "debug");
  setVar("SERVICENOW_MODE", mode, { plain: true });

  const method = (await ask("Auth method: basic, bearer, or oauth", process.env.SERVICENOW_AUTH_METHOD || "basic")).toLowerCase();
  if (!["basic", "bearer", "oauth"].includes(method)) {
    console.error(`Unknown auth method "${method}" -- must be basic, bearer, or oauth.`);
    process.exit(1);
  }
  setVar("SERVICENOW_AUTH_METHOD", method, { plain: true });

  if (method === "basic") {
    setVar("SERVICENOW_USERNAME", await ask("Username", process.env.SERVICENOW_USERNAME), { plain: true });
    setVar("SERVICENOW_PASSWORD", await askSecret("Password", !!process.env.SERVICENOW_PASSWORD));
  } else if (method === "bearer") {
    setVar("SERVICENOW_ACCESS_TOKEN", await askSecret("Access token", !!process.env.SERVICENOW_ACCESS_TOKEN));
  } else {
    setVar("SERVICENOW_OAUTH_CLIENT_ID", await ask("OAuth client ID", process.env.SERVICENOW_OAUTH_CLIENT_ID), { plain: true });
    setVar("SERVICENOW_OAUTH_CLIENT_SECRET", await askSecret("OAuth client secret", !!process.env.SERVICENOW_OAUTH_CLIENT_SECRET));

    const grantType = (await ask("Grant type: password or client_credentials", process.env.SERVICENOW_OAUTH_GRANT_TYPE || "password")).toLowerCase();
    setVar("SERVICENOW_OAUTH_GRANT_TYPE", grantType, { plain: true });

    if (grantType === "password") {
      setVar("SERVICENOW_OAUTH_USERNAME", await ask("OAuth username", process.env.SERVICENOW_OAUTH_USERNAME), { plain: true });
      setVar("SERVICENOW_OAUTH_PASSWORD", await askSecret("OAuth password", !!process.env.SERVICENOW_OAUTH_PASSWORD));
    }
  }

  // The background-script tool (sn_script_execute, sn_acl_create/update) logs
  // in via ServiceNow's UI form regardless of auth method, so it always needs
  // its own real username/password -- ask separately unless basic already covered it.
  if (method !== "basic") {
    console.log("\nBackground scripts and ACL writes always need a real username/password");
    console.log("session (no REST/OAuth/bearer-token equivalent exists for that UI login).");
    const wantBg = await ask("Set/update SERVICENOW_USERNAME/PASSWORD for that too? (y/n)", "y");
    if (wantBg.toLowerCase().startsWith("y")) {
      setVar("SERVICENOW_USERNAME", await ask("Username", process.env.SERVICENOW_USERNAME), { plain: true });
      setVar("SERVICENOW_PASSWORD", await askSecret("Password", !!process.env.SERVICENOW_PASSWORD));
    }
  }

  rl.close();
  console.log(`\nDone -- ${ENV_FILE} updated and re-encrypted.`);
  console.log("Restart the MCP connection (Claude Desktop / Claude Code) for this to take effect.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
