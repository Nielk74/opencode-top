#!/usr/bin/env node
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

// node:sqlite requires --experimental-sqlite on Node 22.x
const [major] = process.version.slice(1).split(".").map(Number);
if (major <= 22 && !process.execArgv.includes("--experimental-sqlite")) {
  const { spawn } = await import("child_process");
  const child = spawn(
    process.execPath,
    ["--experimental-sqlite", ...process.argv.slice(1)],
    { stdio: "inherit" }
  );
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  await import(pathToFileURL(join(__dirname, "..", "dist", "cli.mjs")).href);
}
