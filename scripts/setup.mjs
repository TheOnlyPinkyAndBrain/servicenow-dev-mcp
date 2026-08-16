#!/usr/bin/env node
// Interactive credential/auth-method setup for the ServiceNow MCP server.
// Stands in for the "config page" a hosted connector would have: there's no
// such UI for a locally-spawned MCP server, so this is the practical
// equivalent -- prompts for the fields the chosen auth method needs, and
// writes them through `dotenvx set` so .env stays encrypted at rest.
//
// Supports both single-instance (the original SERVICENOW_INSTANCE_URL /
// SERVICENOW_USERNAME / etc vars) and multi-instance (SERVICENOW_INSTANCES=
// name1,name2 plus SERVICENOW_INSTANCE_<NAME>_* vars per instance) setups --
// see the "Multiple instances" section of README.md for the env var layout.

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

// Printed above a prompt, not part of it -- explains what the field is for,
// valid values, and where to find them, before you're asked to type anything.
function hint(text) {
  for (const line of text.split("\n")) {
    console.log(`  ${line}`);
  }
}

function heading(text) {
  console.log(`\n${text}`);
  console.log("-".repeat(text.length));
}

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

function forceSetVar(key, value, { plain = false } = {}) {
  const args = ["set", key, value, "-f", ENV_FILE];
  if (plain) args.push("-p");
  const result = spawnSync(DOTENVX_BIN, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (result.status !== 0) {
    throw new Error(`Failed to set ${key} (dotenvx exited ${result.status})`);
  }
}

function setVar(key, value, opts = {}) {
  if (!value) return; // blank = keep whatever's already in .env untouched
  forceSetVar(key, value, opts);
}

function delVar(key) {
  const result = spawnSync(DOTENVX_BIN, ["del", key, "-f", ENV_FILE], { stdio: ["ignore", "ignore", "inherit"] });
  if (result.status !== 0) {
    throw new Error(`Failed to delete ${key} (dotenvx exited ${result.status})`);
  }
}

// Every per-instance env var suffix, with whether configureInstance() writes
// it plain (readable) or encrypted -- mirrors configureInstance()'s own
// setVar() calls exactly, since migrateSingleToNamed()/deleteInstance() below
// need to move or remove these without re-prompting for values.
const INSTANCE_FIELDS = [
  { suffix: "URL", plain: true },
  { suffix: "AUTH_METHOD", plain: true },
  { suffix: "USERNAME", plain: true },
  { suffix: "PASSWORD", plain: false },
  { suffix: "ACCESS_TOKEN", plain: false },
  { suffix: "OAUTH_CLIENT_ID", plain: true },
  { suffix: "OAUTH_CLIENT_SECRET", plain: false },
  { suffix: "OAUTH_GRANT_TYPE", plain: true },
  { suffix: "OAUTH_USERNAME", plain: true },
  { suffix: "OAUTH_PASSWORD", plain: false },
];

// Maps a bare suffix (URL, USERNAME, AUTH_METHOD, ...) to the actual env var
// name for either single-instance (prefix null -- the original bare names)
// or multi-instance (prefix = uppercased instance name) setups. Mirrors
// src/config.ts's readInstanceEnv, which has to agree with this at runtime.
function instanceVarName(prefix, suffix) {
  if (!prefix) return suffix === "URL" ? "SERVICENOW_INSTANCE_URL" : `SERVICENOW_${suffix}`;
  return `SERVICENOW_INSTANCE_${prefix}_${suffix}`;
}

// Runs the instance-URL + auth-method + credentials flow for one instance,
// writing to either the bare vars (prefix === null) or the SERVICENOW_
// INSTANCE_<prefix>_* vars. Shared between single- and multi-instance setup
// so both stay in sync with whatever fields each auth method needs.
async function configureInstance(prefix, label) {
  const v = (suffix) => instanceVarName(prefix, suffix);
  const existing = (suffix) => process.env[v(suffix)];

  if (label) heading(label);

  hint("Base URL of this ServiceNow instance, no trailing slash.");
  hint("Example: https://dev12345.service-now.com");
  const instanceUrl = await ask("Instance URL", existing("URL"));
  setVar(v("URL"), instanceUrl, { plain: true });

  hint("basic  = simplest. Just a ServiceNow username + password.");
  hint("bearer = a token you already have from somewhere else -- ServiceNow has");
  hint("         no long-lived personal-access-token concept, so this must be");
  hint("         either a ServiceNow OAuth access token or (rarely) an");
  hint("         externally-trusted OIDC token. Usually short-lived and NOT");
  hint("         auto-refreshed -- if you don't already have one handed to");
  hint("         you, pick oauth below instead.");
  hint("oauth  = ServiceNow's own OAuth token endpoint. Needs an OAuth");
  hint("         application already registered on the instance under");
  hint("         System OAuth > Application Registry (client ID + secret).");
  hint("         Fetches and refreshes tokens automatically -- the right");
  hint("         choice if you don't already have a token in hand.");
  const method = (await ask("Auth method (basic/bearer/oauth)", existing("AUTH_METHOD") || "basic")).toLowerCase();
  if (!["basic", "bearer", "oauth"].includes(method)) {
    console.error(`Unknown auth method "${method}" -- must be basic, bearer, or oauth.`);
    process.exit(1);
  }
  setVar(v("AUTH_METHOD"), method, { plain: true });

  heading(`Credentials (${method})`);

  if (method === "basic") {
    hint("The ServiceNow account this server acts as for every request.");
    hint("Needs roles matching whatever modules you'll actually use -- see the");
    hint("per-module role notes in README.md if a tool call fails with a 403.");
    setVar(v("USERNAME"), await ask("Username", existing("USERNAME")), { plain: true });

    hint("Never echoed to the screen or logged. Stored encrypted in .env.");
    setVar(v("PASSWORD"), await askSecret("Password", !!existing("PASSWORD")));
  } else if (method === "bearer") {
    hint("Must be either a ServiceNow-issued OAuth access token (the same kind");
    hint("the oauth method fetches automatically -- valid if you already");
    hint("obtained one yourself some other way) or an externally-issued OIDC/JWT");
    hint("token, which only works if your instance has Multi-Provider SSO /");
    hint("External OAuth configured to trust that issuer for API calls --");
    hint("check with your ServiceNow admin before assuming that's set up.");
    hint("Typically short-lived (often ~30 min) and NOT refreshed by this");
    hint("server -- once it expires, every request fails until you paste in a");
    hint("fresh one via this wizard. Never echoed or logged.");
    setVar(v("ACCESS_TOKEN"), await askSecret("Access token", !!existing("ACCESS_TOKEN")));
  } else {
    hint("From your ServiceNow instance: System OAuth > Application Registry.");
    hint("Register an OAuth application there first if you haven't -- this");
    hint("script can't create one on the instance for you.");
    setVar(v("OAUTH_CLIENT_ID"), await ask("OAuth client ID", existing("OAUTH_CLIENT_ID")), { plain: true });

    hint("Never echoed to the screen or logged. Stored encrypted in .env.");
    setVar(v("OAUTH_CLIENT_SECRET"), await askSecret("OAuth client secret", !!existing("OAUTH_CLIENT_SECRET")));

    hint("password           = token is tied to a specific user's roles (needs the");
    hint("                      username/password below). Use this for most");
    hint("                      dev/admin work -- it's what most ACL/role checks expect.");
    hint("client_credentials = app-only token, no user context. Only works if your");
    hint("                      OAuth application on the instance is configured to");
    hint("                      allow this grant type.");
    const grantType = (await ask("Grant type (password/client_credentials)", existing("OAUTH_GRANT_TYPE") || "password")).toLowerCase();
    setVar(v("OAUTH_GRANT_TYPE"), grantType, { plain: true });

    if (grantType === "password") {
      hint("The ServiceNow user whose roles the issued token will carry.");
      setVar(v("OAUTH_USERNAME"), await ask("OAuth username", existing("OAUTH_USERNAME")), { plain: true });

      hint("Never echoed to the screen or logged. Stored encrypted in .env.");
      setVar(v("OAUTH_PASSWORD"), await askSecret("OAuth password", !!existing("OAUTH_PASSWORD")));
    }
  }

  // The background-script tool (sn_script_execute, sn_acl_create/update) logs
  // in via ServiceNow's UI form regardless of auth method, so it always needs
  // its own real username/password -- ask separately unless basic already covered it.
  if (method !== "basic") {
    heading("Background-script access (optional)");
    hint("sn_script_execute and the ACL write tools (sn_acl_create/update) log in");
    hint("through ServiceNow's own UI form (sys.scripts.do), not a REST endpoint --");
    hint("there's no OAuth or bearer-token equivalent for that specific login, so");
    hint("they always need a real username/password regardless of your auth method");
    hint("above. Skip this if you won't use those tools on this instance.");
    const wantBg = await ask("Set/update username/password for that? (y/n)", "y");
    if (wantBg.toLowerCase().startsWith("y")) {
      setVar(v("USERNAME"), await ask("Username", existing("USERNAME")), { plain: true });
      setVar(v("PASSWORD"), await askSecret("Password", !!existing("PASSWORD")));
    }
  }

  return instanceUrl || existing("URL");
}

// Names of instances that already have at least a URL configured -- multi-
// instance names from SERVICENOW_INSTANCES if set, otherwise "default" if
// the bare single-instance vars are already populated. Empty on a fresh
// .env copied straight from .env.example, which is how we tell "first-time
// setup" (always walk the full flow) from "already configured" (offer to
// just connect with what's there, or manage instances individually).
function detectExistingInstanceNames() {
  const multiNames = (process.env.SERVICENOW_INSTANCES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (multiNames.length > 0) return multiNames;
  return process.env.SERVICENOW_INSTANCE_URL ? ["default"] : [];
}

// Lets the human pick one of `names` by number or by typing it, printing a
// numbered list first. Single-item lists resolve immediately without asking
// -- there's nothing to choose between.
async function pickInstance(names, question) {
  if (names.length === 1) return names[0];
  names.forEach((n, i) => console.log(`  ${i + 1}) ${n}`));
  const answer = await ask(question, "");
  if (!answer) return null;
  const byIndex = names[parseInt(answer, 10) - 1];
  if (byIndex) return byIndex;
  const byName = names.find((n) => n.toLowerCase() === answer.toLowerCase());
  if (byName) return byName;
  console.error(`"${answer}" is not one of: ${names.join(", ")}`);
  return null;
}

// Moves the bare SERVICENOW_INSTANCE_URL/etc vars (single-instance mode) to
// SERVICENOW_INSTANCE_<NAME>_* vars. Needed the moment a second instance is
// added, since config.ts stops reading the bare vars entirely once
// SERVICENOW_INSTANCES is set -- without this, adding instance #2 would
// silently orphan instance #1's credentials.
function migrateSingleToNamed(name) {
  const upper = name.toUpperCase();
  for (const { suffix, plain } of INSTANCE_FIELDS) {
    const bareKey = instanceVarName(null, suffix);
    const value = process.env[bareKey];
    if (!value) continue;
    forceSetVar(instanceVarName(upper, suffix), value, { plain });
    delVar(bareKey);
    process.env[instanceVarName(upper, suffix)] = value;
    delete process.env[bareKey];
  }
}

// Adds one new instance alongside whatever's already configured -- never
// touches the existing names' vars. This is the fix for "adding an instance
// silently replaced the others": SERVICENOW_INSTANCES is always written as
// existingNames + the new one, never rebuilt from scratch.
async function addInstance(existingNames) {
  heading("Add a new instance");
  hint("Short identifier used to select this instance later (sn_instance_switch,");
  hint("SERVICENOW_DEFAULT_INSTANCE) -- letters, digits, underscore only, e.g. 'staging'.");
  let name;
  for (;;) {
    name = await ask("New instance name", "");
    if (!name) {
      console.error("Instance name is required.");
      continue;
    }
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      console.error("Instance name must start with a letter and contain only letters, digits, underscores.");
      continue;
    }
    if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      console.error(`"${name}" already exists -- pick a different name, or choose "update" instead.`);
      continue;
    }
    break;
  }

  if (!process.env.SERVICENOW_INSTANCES) {
    migrateSingleToNamed(existingNames[0]);
  }

  await configureInstance(name.toUpperCase(), `Instance "${name}"`);

  const allNames = [...existingNames, name];
  setVar("SERVICENOW_INSTANCES", allNames.join(","), { plain: true });
  if (!process.env.SERVICENOW_DEFAULT_INSTANCE) {
    setVar("SERVICENOW_DEFAULT_INSTANCE", existingNames[0], { plain: true });
  }

  console.log(`\nAdded "${name}". Instances now: ${allNames.join(", ")}.`);
}

// Re-runs the credential/URL prompts for one already-configured instance,
// leaving every other instance (and SERVICENOW_INSTANCES itself) untouched.
async function updateInstance(existingNames) {
  heading("Update an instance");
  const name = await pickInstance(existingNames, "Which instance to update?");
  if (!name) {
    console.log("Nothing selected -- no changes made.");
    return;
  }
  const prefix = process.env.SERVICENOW_INSTANCES ? name.toUpperCase() : null;
  await configureInstance(prefix, `Instance "${name}"`);
  console.log(`\nUpdated "${name}".`);
}

// Removes one instance's vars and its entry in SERVICENOW_INSTANCES, leaving
// every other instance untouched. Refuses to delete the last remaining
// instance -- reconfigure from scratch instead if you want zero instances.
async function deleteInstance(existingNames) {
  if (existingNames.length === 1) {
    console.error('Can\'t delete the only configured instance -- add another one first, or choose "Reconfigure everything from scratch".');
    return;
  }
  heading("Delete an instance");
  const name = await pickInstance(existingNames, "Which instance to delete?");
  if (!name) {
    console.log("Nothing selected -- no changes made.");
    return;
  }
  const confirm = await ask(`Type "${name}" again to confirm deletion`, "");
  if (confirm !== name) {
    console.log("Not confirmed -- nothing deleted.");
    return;
  }

  const upper = name.toUpperCase();
  for (const { suffix } of INSTANCE_FIELDS) {
    const key = instanceVarName(upper, suffix);
    if (process.env[key]) {
      delVar(key);
      delete process.env[key];
    }
  }

  const remaining = existingNames.filter((n) => n !== name);
  setVar("SERVICENOW_INSTANCES", remaining.join(","), { plain: true });

  if (process.env.SERVICENOW_DEFAULT_INSTANCE === name) {
    setVar("SERVICENOW_DEFAULT_INSTANCE", remaining[0], { plain: true });
    console.log(`Default instance was "${name}" -- switched default to "${remaining[0]}".`);
  }

  console.log(`\nDeleted "${name}". Remaining instances: ${remaining.join(", ")}.`);
}

// The original from-scratch flow: asks single vs. multi, then walks every
// instance's credentials from zero. Used both for a totally fresh .env and
// as the explicit "start over" escape hatch from the manage-instances menu
// -- never run implicitly just because instances already exist.
async function firstTimeInstanceSetup() {
  heading("How many ServiceNow instances?");
  hint("Most setups talk to exactly one instance. If you regularly work across");
  hint("more than one (e.g. dev + prod), this server can hold all of them and");
  hint("either prompt which to use at the start of a session, or you can switch");
  hint("with the sn_instance_switch tool mid-conversation.");
  const existingInstances = (process.env.SERVICENOW_INSTANCES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const multi = (
    await ask(
      "Configure multiple instances? (y/n)",
      existingInstances.length > 1 ? "y" : "n"
    )
  ).toLowerCase().startsWith("y");

  if (!multi) {
    await configureInstance(null, "Instance & credentials");
    // Clear any stale multi-instance vars from a previous run so config.ts
    // doesn't think this is still a multi-instance setup. setVar() no-ops on
    // an empty value (that's what lets other prompts mean "keep current"),
    // so this needs the unconditional variant.
    if (process.env.SERVICENOW_INSTANCES) {
      forceSetVar("SERVICENOW_INSTANCES", "", { plain: true });
    }
  } else {
    const names = [];
    heading("Instance names");
    hint("Short identifiers used to select an instance later (sn_instance_switch,");
    hint("SERVICENOW_DEFAULT_INSTANCE) -- letters, digits, underscore only, e.g. 'dev', 'prod'.");
    let more = true;
    while (more) {
      const name = await ask(names.length === 0 ? "First instance name" : "Next instance name (blank to stop)", "");
      if (!name) {
        if (names.length === 0) {
          console.error("At least one instance name is required.");
          continue;
        }
        more = false;
        break;
      }
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
        console.error("Instance name must start with a letter and contain only letters, digits, underscores.");
        continue;
      }
      names.push(name);
      await configureInstance(name.toUpperCase(), `Instance "${name}"`);
    }

    setVar("SERVICENOW_INSTANCES", names.join(","), { plain: true });

    heading("Default instance");
    hint("Used when a session starts on an MCP client that can't prompt (no");
    hint("elicitation support), or whenever sn_instance_switch hasn't been called yet.");
    const defaultInstance = await ask(`Default instance (${names.join("/")})`, process.env.SERVICENOW_DEFAULT_INSTANCE || names[0]);
    setVar("SERVICENOW_DEFAULT_INSTANCE", defaultInstance, { plain: true });
  }
}

// The add/update/delete menu -- reached only when at least one instance is
// already configured and the human explicitly chose "manage" over "connect".
async function manageInstances(existingNames) {
  heading("Manage instances");
  hint("Add, update, or delete one instance without touching the others -- or");
  hint("reconfigure everything from scratch if you'd rather start over.");
  console.log("");
  console.log("  1) Add a new instance");
  console.log("  2) Update an existing instance");
  console.log("  3) Delete an instance");
  console.log("  4) Reconfigure everything from scratch (mode + all instances)");
  const choice = (await ask("Choice (1-4)", "1")).trim();

  if (choice === "2") {
    await updateInstance(existingNames);
  } else if (choice === "3") {
    await deleteInstance(existingNames);
  } else if (choice === "4") {
    await firstTimeInstanceSetup();
  } else {
    await addInstance(existingNames);
  }
}

// Shared tail end of every path through main(): mode + script-execution
// settings, save confirmation, and restarting the running server so the
// client reconnects with the new config.
async function finishAndRestart() {
  heading("Mode");
  hint("debug   = read-only. Safe default -- nothing can be created, changed, or");
  hint("          deleted on your instance.");
  hint("develop = adds create/update/delete tools. Only switch once you trust");
  hint("          this setup and actually need write access.");
  const mode = await ask("Mode (debug/develop)", process.env.SERVICENOW_MODE || "debug");
  setVar("SERVICENOW_MODE", mode, { plain: true });

  heading("Script execution (optional)");
  hint("sn_script_execute / sn_script_execute_query run arbitrary server-side");
  hint("JavaScript -- the highest-impact capability this server exposes. Keep");
  hint("this off unless you specifically need ad-hoc scripting.");
  const enableScriptExecute = await ask(
    "Enable script execution? (y/n)",
    process.env.SERVICENOW_ENABLE_SCRIPT_EXECUTE === "true" ? "y" : "n"
  );
  setVar("SERVICENOW_ENABLE_SCRIPT_EXECUTE", enableScriptExecute.toLowerCase().startsWith("y") ? "true" : "false", { plain: true });

  rl.close();

  heading("Saved");
  console.log(`${ENV_FILE} has been updated -- every value you entered is now written`);
  console.log("through dotenvx, so secrets are encrypted at rest, not plaintext.");

  heading("What happens now");
  killRunningServer();
}

async function main() {
  console.log("ServiceNow MCP setup");
  console.log("This walks through instance, mode, and auth-method setup, writing each");
  console.log("value into .env (encrypted via dotenvx) as you go. Blank = keep the current");
  console.log("value, so re-running this later to rotate one credential won't make you");
  console.log("retype everything.");
  console.log("");
  console.log("Nothing here restarts the MCP connection automatically -- an MCP client");
  console.log("(Claude Desktop/Code) owns its server process and only reads .env when it");
  console.log("spawns that process, so a running server can't be handed new config live.");
  console.log("At the end, this script stops any currently-running server so it can't keep");
  console.log("using the old settings, and prints exactly what to do next to reconnect.");

  const existingNames = detectExistingInstanceNames();

  if (existingNames.length > 0) {
    // Instances already exist -- this is the very first decision, before
    // mode or anything else: use what's there, or go manage instances.
    // "Manage" never rebuilds SERVICENOW_INSTANCES from scratch on its own;
    // only the explicit "reconfigure everything" item inside it does that.
    heading("Existing configuration found");
    console.log(`Mode: ${process.env.SERVICENOW_MODE || "debug"}`);
    for (const name of existingNames) {
      const prefix = process.env.SERVICENOW_INSTANCES ? name.toUpperCase() : null;
      const url = process.env[instanceVarName(prefix, "URL")] || "(no URL set)";
      const authMethod = process.env[instanceVarName(prefix, "AUTH_METHOD")] || "basic";
      console.log(`  - ${name}: ${url} (${authMethod})`);
    }
    console.log("");
    const choice = await ask(
      "Connect using this configuration, or manage instances (add/update/delete)? (connect/manage)",
      "connect"
    );

    if (!choice.toLowerCase().startsWith("m")) {
      if (existingNames.length > 1) {
        heading("Default instance");
        hint("Which instance should this session fall back to by default? An MCP");
        hint("client that supports elicitation still gets its own picker at connection");
        hint("time -- this only sets the fallback for clients that don't.");
        const picked = await pickInstance(
          existingNames,
          `Default instance (currently "${process.env.SERVICENOW_DEFAULT_INSTANCE || existingNames[0]}")`
        );
        if (picked) setVar("SERVICENOW_DEFAULT_INSTANCE", picked, { plain: true });
      }
      rl.close();
      heading("Using existing configuration");
      console.log(`${ENV_FILE} left unchanged (aside from the default instance, if you changed it).`);
      console.log("Restarting the server so your client reconnects with it.");
      killRunningServer();
      return;
    }

    await manageInstances(existingNames);
    await finishAndRestart();
    return;
  }

  // Nothing configured yet (fresh .env) -- walk the full first-time flow.
  await firstTimeInstanceSetup();
  await finishAndRestart();
}

// Kills any currently-running instance of this specific server (matched by
// its absolute dist/index.js path, so this can't touch an unrelated node
// process) so a stale process can't keep serving old credentials silently.
// This is as far as automation can go: an MCP client owns its server
// process's lifecycle and spawns it once at connection time, so nothing
// server-side -- this script included -- can make the client reconnect on
// its own. Killing the process just makes that reconnect necessary and
// visible instead of silently optional.
function killRunningServer() {
  const distEntry = join(__dirname, "..", "dist", "index.js");
  const result = spawnSync("pgrep", ["-f", distEntry], { encoding: "utf8" });
  const pids = (result.stdout || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((pid) => pid !== process.pid);

  if (pids.length === 0) {
    console.log("No running server process found -- nothing to stop.");
    console.log("Just connect the MCP server in your client as usual; it'll read the");
    console.log("values you just set the moment it starts.");
    return;
  }

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
      console.log(`Stopped the running server (pid ${pid}) so it can't keep using the old config.`);
    } catch {
      // already gone
    }
  }
  console.log("");
  console.log("You still need to reconnect it in your client -- that part isn't automatic:");
  console.log("  Claude Code:    run /mcp and reconnect the servicenow server, or start a");
  console.log("                  new session if /mcp isn't available.");
  console.log("  Claude Desktop: some versions auto-respawn a stopped server on the next");
  console.log("                  tool call, others don't -- if tools error out or look");
  console.log("                  stale, fully quit (Cmd+Q) and reopen to be sure.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
