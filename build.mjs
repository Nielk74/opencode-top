import { build } from "esbuild";
import { mkdirSync, realpathSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/cli.mjs",
  // Keep native modules and all Node built-ins external
  external: [
    "better-sqlite3",
    "bufferutil",
    "utf-8-validate",
  ],
  // Stub out optional ink devtools (only used in dev mode)
  alias: {
    "react-devtools-core": join(__dirname, "stub-devtools.js"),
  },
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // Provide require() for CJS deps bundled into the ESM output
  banner: {
    js: [
      `import { createRequire } from "module";`,
      `const require = createRequire(import.meta.url);`,
    ].join("\n"),
  },
});

console.log("✓ Built dist/cli.mjs");
