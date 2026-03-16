import { build } from "esbuild";
import { mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

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
    "__PKG_VERSION__": JSON.stringify(pkg.version),
    "__PKG_NAME__": JSON.stringify(pkg.name),
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
