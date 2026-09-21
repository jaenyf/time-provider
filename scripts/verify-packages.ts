#!/usr/bin/env node
// Verifies what would actually be published, rather than what is sitting in
// packages/<name>/dist. `vp test` and packages/test-e2e both import the build
// output by path, so neither would notice a package.json whose `files` or
// `exports` no longer describe the tree npm packs - a stale `exports` target,
// a renamed chunk, or source and test files riding along into the tarball.
//
// For every publishable package this:
//   1. runs `npm pack` and checks the file list against an allowlist, so
//      nothing outside dist/, README.md and package.json can be published;
//   2. extracts the tarballs side by side into a staging node_modules, with
//      the peer date libraries linked in from this repo;
//   3. imports every subpath in each package's `exports` from that staging
//      tree, which is Node's own resolver reading the packed package.json,
//      and checks the module has something on it;
//   4. checks every file an `exports` or `types` entry points at is
//      actually inside the tarball.
//
// The publishable set comes from release-please-config.json, which is the
// same list the release workflow publishes from - a package missing there
// cannot ship, so it has nothing to verify.
//
// Needs `vp run build` to have run first. Run it with Node 24+:
// node scripts/verify-packages.ts

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const ROOT = process.cwd();

/** Everything a published tarball is allowed to contain. */
const ALLOWED = [/^package\.json$/, /^README\.md$/, /^dist\/.+$/];

/** Paths that must never be published, checked separately so the error says why. */
const FORBIDDEN: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /(^|\/)src\//, reason: "source file" },
  { pattern: /\.(test|spec)\./, reason: "test file" },
  { pattern: /(^|\/)tsconfig[^/]*\.json$/, reason: "tsconfig" },
  { pattern: /\.map$/, reason: "source map" },
  { pattern: /(^|\/)\.env/, reason: "environment file" },
  { pattern: /(^|\/)vite\.config\./, reason: "build config" },
];

/** Peer date libraries a plugin imports, linked into the staging tree from this repo. */
const PEER_SEARCH_ROOTS = [
  "node_modules",
  "packages/test/node_modules",
  "packages/test-e2e/node_modules",
  "website/node_modules",
];

interface PackedFile {
  path: string;
}

interface PackResult {
  filename: string;
  files: PackedFile[];
}

interface PackageJson {
  name: string;
  version: string;
  exports?: Record<string, string>;
  types?: string;
  peerDependencies?: Record<string, string>;
}

const failures: string[] = [];

function fail(pkg: string, message: string): void {
  failures.push(`${pkg}: ${message}`);
}

function publishablePackageDirs(): string[] {
  const config = JSON.parse(readFileSync(join(ROOT, "release-please-config.json"), "utf8")) as {
    packages: Record<string, unknown>;
  };
  return Object.keys(config.packages).sort();
}

function readPackageJson(dir: string): PackageJson {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as PackageJson;
}

function pack(dir: string, destination: string): PackResult {
  const stdout = execFileSync("npm", ["pack", "--json", "--pack-destination", destination], {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return (JSON.parse(stdout) as PackResult[])[0];
}

function checkContents(pkg: PackageJson, files: PackedFile[]): void {
  for (const { path } of files) {
    const forbidden = FORBIDDEN.find((rule) => rule.pattern.test(path));
    if (forbidden) {
      fail(pkg.name, `packs a ${forbidden.reason}: ${path}`);
      continue;
    }
    if (!ALLOWED.some((pattern) => pattern.test(path))) {
      fail(pkg.name, `packs an unexpected file: ${path}`);
    }
  }
  if (!files.some(({ path }) => path === "package.json")) {
    fail(pkg.name, "tarball has no package.json");
  }
  if (!files.some(({ path }) => path.startsWith("dist/"))) {
    fail(pkg.name, "tarball has no dist/ output");
  }
}

/** Every file an exports/types entry points at has to be in the tarball. */
function checkDeclaredFiles(pkg: PackageJson, files: PackedFile[]): void {
  const packed = new Set(files.map(({ path }) => path));
  const declared = new Set<string>();

  for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
    if (subpath !== "./package.json") declared.add(target);
  }
  if (pkg.types !== undefined) declared.add(pkg.types);

  for (const target of declared) {
    const normalized = target.replace(/^\.\//, "");
    if (!packed.has(normalized)) {
      fail(pkg.name, `declares "${target}" but the tarball doesn't contain it`);
    }
  }
}

function extract(tarball: string, into: string): void {
  mkdirSync(into, { recursive: true });
  // npm tarballs put everything under a "package/" prefix.
  execFileSync("tar", ["-xzf", tarball, "-C", into, "--strip-components=1"], { stdio: "inherit" });
}

function linkPeers(pkgs: PackageJson[], stagingModules: string): void {
  const needed = new Set<string>();
  for (const pkg of pkgs) {
    for (const peer of Object.keys(pkg.peerDependencies ?? {})) {
      if (!peer.startsWith("@time-provider/")) needed.add(peer);
    }
  }

  for (const peer of needed) {
    const source = PEER_SEARCH_ROOTS.map((root) => join(ROOT, root, peer)).find((path) =>
      existsSync(path),
    );
    if (source === undefined) {
      failures.push(`peer dependency "${peer}" is not installed anywhere in this repo`);
      continue;
    }
    const target = join(stagingModules, peer);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(source, target, "dir");
  }
}

/** Imports a subpath through Node's resolver, from the staging tree. */
function checkImport(pkg: PackageJson, subpath: string, staging: string): void {
  const specifier = subpath === "." ? pkg.name : `${pkg.name}/${subpath.replace(/^\.\//, "")}`;
  const source = `
    const module = await import(${JSON.stringify(specifier)});
    const names = Object.keys(module);
    if (names.length === 0) throw new Error("resolved but exports nothing");
  `;
  try {
    execFileSync(process.execPath, ["--input-type=module", "--eval", source], {
      cwd: staging,
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
    });
  } catch (error) {
    // Node leads with an internal frame and trails with its version banner, so the
    // useful line is the first one naming an error, e.g. "Error [ERR_MODULE_NOT_FOUND]: ...".
    const stderr = (error as { stderr?: string }).stderr ?? "";
    const details =
      stderr.split("\n").find((line) => /^\w*Error\b[^:]*:/.test(line.trim())) ??
      stderr.trim().split("\n")[0] ??
      "no output";
    fail(pkg.name, `importing "${specifier}" from a packed install failed: ${details.trim()}`);
  }
}

function main(): void {
  const staging = mkdtempSync(join(tmpdir(), "time-provider-verify-"));
  const stagingModules = join(staging, "node_modules");
  mkdirSync(stagingModules, { recursive: true });

  try {
    const dirs = publishablePackageDirs();
    const pkgs: PackageJson[] = [];

    for (const dir of dirs) {
      const absolute = resolve(ROOT, dir);
      const pkg = readPackageJson(absolute);
      pkgs.push(pkg);

      if (!existsSync(join(absolute, "dist"))) {
        fail(pkg.name, "has no dist/ - run `vp run build` first");
        continue;
      }

      const { filename, files } = pack(absolute, staging);
      checkContents(pkg, files);
      checkDeclaredFiles(pkg, files);
      extract(join(staging, filename), join(stagingModules, pkg.name));
    }

    linkPeers(pkgs, stagingModules);

    for (const pkg of pkgs) {
      for (const subpath of Object.keys(pkg.exports ?? { ".": "" })) {
        if (subpath === "./package.json") continue;
        checkImport(pkg, subpath, staging);
      }
    }

    if (failures.length > 0) {
      console.error(`Package verification failed:\n  ${failures.join("\n  ")}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Verified ${String(dirs.length)} packed packages.`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

main();
