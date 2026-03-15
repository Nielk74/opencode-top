import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

describe("build output", () => {
  it("dist/cli.mjs has no duplicate createRequire declaration", () => {
    const bundle = readFileSync(join(root, "dist", "cli.mjs"), "utf8");
    const matches = bundle.match(/\bcreateRequire\b/g) ?? [];
    // Exactly 2: one import, one usage in the banner
    expect(matches.length).toBe(2);
  });

  it("--version matches package.json version", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const output = execSync(`node ${join(root, "dist", "cli.mjs")} --version`, {
      encoding: "utf8",
    }).trim();
    expect(output).toBe(pkg.version);
  });
});
