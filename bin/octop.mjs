#!/usr/bin/env node
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");

// Use tsx to run the TypeScript source
const { register } = await import("tsx/esm/api");
register();

await import(join(pkgRoot, "src", "cli.ts"));
