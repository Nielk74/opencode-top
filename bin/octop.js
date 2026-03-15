#!/usr/bin/env node
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(join(__dirname, "..", "dist", "cli.mjs")).href);
