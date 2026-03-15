#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { program } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { App } from "./ui/App";
import { loadSessions, getDbPath } from "./data/sqlite";
import { groupSessionsToWorkflows } from "./core/agents";
import { getWorkflowCostSingle, getSessionDuration } from "./core/session";
import { getPricing } from "./data/pricing";

declare const __PKG_VERSION__: string | undefined;
declare const __PKG_NAME__: string | undefined;

// In bundled form (npm run build), esbuild replaces __PKG_VERSION__ / __PKG_NAME__.
// In dev (npm start / tsx), those defines are absent — read package.json directly.
function devPkg(): { version: string; name: string } {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    return JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string; name: string };
  } catch {
    return { version: "dev", name: "opencode-top" };
  }
}

const pkg =
  typeof __PKG_VERSION__ !== "undefined" && typeof __PKG_NAME__ !== "undefined"
    ? { version: __PKG_VERSION__, name: __PKG_NAME__ }
    : devPkg();

program
  .name(pkg.name)
  .version(pkg.version)
  .description("Monitor OpenCode AI coding sessions");

program
  .command("live")
  .description("Start live monitoring dashboard")
  .option("-i, --interval <ms>", "Refresh interval in milliseconds", "2000")
  .action((options) => {
    const refreshInterval = Number.parseInt(options.interval, 10);
    render(React.createElement(App, { refreshInterval }));
  });

program
  .command("sessions")
  .description("List all sessions")
  .option("-l, --limit <n>", "Limit number of sessions", "50")
  .action((options) => {
    const limit = Number.parseInt(options.limit, 10);
    try {
      const { sessions } = loadSessions(getDbPath());
      const workflows = groupSessionsToWorkflows(sessions);

      const shown = workflows.slice(0, limit);
      console.log(`\nOCMonitor — ${shown.length}/${workflows.length} workflows\n`);
      console.log(`${"Title".padEnd(40)} ${"Project".padEnd(20)} ${"Cost".padEnd(10)} Dur`);
      console.log("─".repeat(80));

      for (const workflow of shown) {
        const { mainSession } = workflow;
        const pricing = getPricing(mainSession.interactions[0]?.modelId ?? "");
        const cost = getWorkflowCostSingle(workflow, pricing);
        const dur = getSessionDuration(mainSession);
        const title = (mainSession.title ?? "Untitled").slice(0, 38).padEnd(40);
        const project = (mainSession.projectName ?? "—").slice(0, 18).padEnd(20);
        const costStr = `$${cost.toFixed(3)}`.padEnd(10);
        const durStr = dur > 0 ? `${Math.floor(dur / 60000)}m${Math.floor((dur % 60000) / 1000)}s` : "—";
        console.log(`${title} ${project} ${costStr} ${durStr}`);
      }
      console.log();
    } catch (e) {
      console.error("Error:", e instanceof Error ? e.message : e);
      process.exit(1);
    }
  });

program.parse();
