#!/usr/bin/env node
// Verifies what would actually be published, rather than what is sitting in
// packages/<name>/dist. `vp test` and packages/test-e2e both import the build
// output by path, so neither would notice a package.json whose `files` or
// `exports` no longer describe the tree npm packs - a stale `exports` target,
// a renamed chunk, or source and test files riding along into the tarball.
//
// For every publishable package this:
//   1. runs `npm pack` and checks the file list against an allowlist, so
//      nothing outside dist/, README.md, LICENSE and package.json can be
//      published, and the LICENSE is there;
//   2. extracts the tarballs side by side into a staging node_modules, with
//      the peer date libraries linked in from this repo;
//   3. imports and requires every subpath in each package's `exports` from
//      that staging tree, which is Node's own resolver reading the packed
//      package.json, and checks the module has something on it and that
//      `require` got the CJS build rather than Node's require(esm) fallback;
//   4. checks the package declares `types`, and every file an `exports`,
//      `main`, `types` or `typesVersions` entry points at is actually inside
//      the tarball.
//
// The publishable set comes from release-please-config.json, which is the
// same list the release workflow publishes from - a package missing there
// cannot ship, so it has nothing to verify. That makes the release config
// itself worth checking, which this also does:
//   5. every package under packages/ that isn't private is in both the
//      release config and the manifest, and both describe packages that
//      exist - a package missing from either silently never publishes;
//   6. the manifest version and the package.json version agree;
//   7. a publishable package isn't marked private and has the `release`
//      script the publish job runs;
//   8. each plugin's and addon's `@time-provider/core` peer range still
//      admits the core version in this repo;
//   9. no publishable package declares runtime dependencies, which is what
//      lets SECURITY.md say a vulnerability in this repo's tooling cannot
//      reach a consumer;
//  10. each package's LICENSE is byte-identical to the repository's, since
//      npm only packs one sitting in the package directory and twelve
//      copies drift without being read.
//
// Needs `vp run build` to have run first. Run it with Node 24+:
// node scripts/verify-packages.ts

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const ROOT = process.cwd();

/** Everything a published tarball is allowed to contain. */
const ALLOWED = [/^package\.json$/, /^README\.md$/, /^LICENSE$/, /^dist\/.+$/];

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
  private?: boolean;
  scripts?: Record<string, string>;
  exports?: Record<string, string | Record<string, string>>;
  main?: string;
  types?: string;
  typesVersions?: Record<string, Record<string, string[]>>;
  peerDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

const failures: string[] = [];

function fail(pkg: string, message: string): void {
  failures.push(`${pkg}: ${message}`);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8")) as T;
}

function publishablePackageDirs(): string[] {
  const config = readJson<{ packages: Record<string, unknown> }>("release-please-config.json");
  return Object.keys(config.packages).sort();
}

function readManifest(): Record<string, string> {
  return readJson<Record<string, string>>(".release-please-manifest.json");
}

function readPackageJson(dir: string): PackageJson {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as PackageJson;
}

/** Every packages/<name>/ that holds a package.json, released or not. */
function workspacePackageDirs(): string[] {
  return readdirSync(join(ROOT, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}`)
    .filter((dir) => existsSync(join(ROOT, dir, "package.json")))
    .sort();
}

/**
 * The release config, the manifest and the workspace have to describe the same set of
 * packages. A package missing from either file is never released and never complains.
 */
function checkReleaseConfig(configured: string[], manifest: Record<string, string>): void {
  const inConfig = new Set(configured);
  const inManifest = new Set(Object.keys(manifest));

  for (const dir of workspacePackageDirs()) {
    const pkg = readPackageJson(join(ROOT, dir));
    if (pkg.private === true) continue;
    if (!inConfig.has(dir)) {
      fail(
        pkg.name,
        "is publishable but missing from release-please-config.json, so it never ships",
      );
    } else if (!inManifest.has(dir)) {
      fail(
        pkg.name,
        "is in release-please-config.json but missing from .release-please-manifest.json",
      );
    }
  }

  for (const dir of inConfig) {
    if (!existsSync(join(ROOT, dir, "package.json"))) {
      failures.push(`release-please-config.json lists "${dir}", which has no package.json`);
    }
  }
  for (const dir of inManifest) {
    if (!inConfig.has(dir)) {
      failures.push(
        `.release-please-manifest.json lists "${dir}", which release-please-config.json doesn't`,
      );
    }
  }
}

/** What release-please and the publish job assume about a package it is going to release. */
function checkReleaseMetadata(
  dir: string,
  pkg: PackageJson,
  manifest: Record<string, string>,
): void {
  const released = manifest[dir];
  if (released !== undefined && released !== pkg.version) {
    fail(
      pkg.name,
      `is ${pkg.version} in package.json but ${released} in .release-please-manifest.json`,
    );
  }
  if (pkg.private === true) {
    fail(
      pkg.name,
      "is in release-please-config.json but marked private, so npm refuses to publish it",
    );
  }
  if (pkg.scripts?.release === undefined) {
    fail(pkg.name, "has no `release` script, which is what the publish job runs");
  }
  const jsr = readJson<{ name?: string; version?: string }>(join(dir, "deno.json"));
  if (jsr.name !== pkg.name || jsr.version !== pkg.version) {
    fail(
      pkg.name,
      `is ${pkg.version} in package.json but ${jsr.name}@${jsr.version} in deno.json, which JSR publishes`,
    );
  }
}

/**
 * Whether `version` falls in a caret range, which is the only shape the core peer uses.
 * Returns undefined for anything this can't read, so an unknown range is reported rather
 * than quietly passing.
 */
function satisfiesCaret(version: string, range: string): boolean | undefined {
  const parse = (text: string): number[] | undefined =>
    /^(\d+)\.(\d+)\.(\d+)$/.exec(text)?.slice(1).map(Number);

  const lower = range.startsWith("^") ? parse(range.slice(1)) : undefined;
  const actual = parse(version);
  if (lower === undefined || actual === undefined) return undefined;

  // A caret allows everything up to a change in the leftmost non-zero component:
  // ^3.1.0 is <4.0.0, ^0.5.1 is <0.6.0, ^0.0.3 is <0.0.4.
  const pinned = lower.findIndex((part) => part !== 0);
  if (pinned === -1) return undefined;
  const upper = lower.map((part, index) => (index === pinned ? part + 1 : 0));

  const compare = (a: number[], b: number[]): number => {
    for (const [index, part] of a.entries()) {
      if (part !== b[index]) return part - b[index];
    }
    return 0;
  };
  return compare(actual, lower) >= 0 && compare(actual, upper) < 0;
}

/**
 * A published package installs nothing of its own: it declares peers the application
 * resolves, so no dependency of this repository reaches a consumer. SECURITY.md states
 * that, and the report-only `bun audit` in CI rests on it, so it is checked rather than
 * left as a habit.
 */
function checkNoRuntimeDependencies(pkg: PackageJson): void {
  for (const field of ["dependencies", "optionalDependencies"] as const) {
    const declared = Object.keys(pkg[field] ?? {});
    if (declared.length > 0) {
      fail(
        pkg.name,
        `declares ${field} (${declared.join(", ")}) - a published package takes peers only, see SECURITY.md#dependencies`,
      );
    }
  }
}

/** AGENTS.md asks for this range to track the core version; nothing enforced it. */
function checkCorePeerRange(pkg: PackageJson, coreVersion: string): void {
  const range = pkg.peerDependencies?.["@time-provider/core"];
  if (range === undefined) return;

  const satisfied = satisfiesCaret(coreVersion, range);
  if (satisfied === undefined) {
    fail(pkg.name, `declares core peer range "${range}", which this script can't read - extend it`);
  } else if (!satisfied) {
    fail(pkg.name, `requires core "${range}", which doesn't admit this repo's core ${coreVersion}`);
  }
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
  if (!files.some(({ path }) => path === "LICENSE")) {
    fail(pkg.name, "tarball has no LICENSE - the MIT notice has to travel with the copy");
  }
}

/**
 * npm only picks up a LICENSE sitting in the package directory, so each package carries
 * its own copy of the repository's. Twelve copies drift silently - a new year on the
 * root notice and nowhere else - so they are compared rather than trusted.
 */
function checkLicense(dir: string, pkg: PackageJson, rootLicense: string): void {
  const path = join(dir, "LICENSE");
  if (!existsSync(path)) {
    fail(pkg.name, "has no LICENSE, so the tarball would ship none - copy the root one");
  } else if (readFileSync(path, "utf8") !== rootLicense) {
    fail(pkg.name, "has a LICENSE that differs from the repository's - copy the root one");
  }
}

/** A package declares its types, and every file its manifest points at is in the tarball. */
function checkDeclaredFiles(pkg: PackageJson, files: PackedFile[]): void {
  const packed = new Set(files.map(({ path }) => path));
  const declared = new Set<string>();

  for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
    if (subpath === "./package.json") continue;
    for (const file of typeof target === "string" ? [target] : Object.values(target)) {
      declared.add(file);
    }
  }
  if (pkg.main !== undefined) declared.add(pkg.main);
  for (const file of Object.values(pkg.typesVersions ?? {})
    .flatMap(Object.values)
    .flat()) {
    declared.add(file);
  }
  if (pkg.types === undefined) {
    fail(pkg.name, "declares no `types`, so older TypeScript setups and the types badge miss them");
  } else {
    declared.add(pkg.types);
  }

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
function checkImport(
  pkg: PackageJson,
  subpath: string,
  staging: string,
  loader: "import" | "require",
): void {
  const specifier = subpath === "." ? pkg.name : `${pkg.name}/${subpath.replace(/^\.\//, "")}`;
  const quoted = JSON.stringify(specifier);
  const source =
    loader === "import"
      ? `
    const module = await import(${quoted});
    if (Object.keys(module).length === 0) throw new Error("resolved but exports nothing");
  `
      : `
    // Node 20.19+ can require() an ES module, which would hide a missing CJS build.
    if (!require.resolve(${quoted}).endsWith(".cjs")) throw new Error("resolved to the ES module");
    if (Object.keys(require(${quoted})).length === 0) throw new Error("resolved but exports nothing");
  `;
  const inputType = loader === "import" ? "module" : "commonjs";
  try {
    execFileSync(process.execPath, [`--input-type=${inputType}`, "--eval", source], {
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
    fail(pkg.name, `${loader} "${specifier}" from a packed install failed: ${details.trim()}`);
  }
}

function main(): void {
  const staging = mkdtempSync(join(tmpdir(), "time-provider-verify-"));
  const stagingModules = join(staging, "node_modules");
  mkdirSync(stagingModules, { recursive: true });

  try {
    const dirs = publishablePackageDirs();
    const manifest = readManifest();
    const coreVersion = readPackageJson(resolve(ROOT, "packages/core")).version;
    const rootLicense = readFileSync(join(ROOT, "LICENSE"), "utf8");
    const pkgs: PackageJson[] = [];

    checkReleaseConfig(dirs, manifest);

    for (const dir of dirs) {
      const absolute = resolve(ROOT, dir);
      // checkReleaseConfig already reported this one; don't crash reading it.
      if (!existsSync(join(absolute, "package.json"))) continue;

      const pkg = readPackageJson(absolute);
      pkgs.push(pkg);

      checkReleaseMetadata(dir, pkg, manifest);
      checkCorePeerRange(pkg, coreVersion);
      checkNoRuntimeDependencies(pkg);
      checkLicense(absolute, pkg, rootLicense);

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
        checkImport(pkg, subpath, staging, "import");
        checkImport(pkg, subpath, staging, "require");
      }
    }

    if (failures.length > 0) {
      console.error(`Package verification failed:\n  ${failures.join("\n  ")}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Verified ${String(dirs.length)} packed packages and their release config.`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

main();
