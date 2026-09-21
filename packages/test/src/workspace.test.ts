import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";

/**
 * Guards the workspace metadata that nothing else checks: the peer ranges every plugin and
 * addon declares on `@time-provider/core`, the Node floor every published package states, and
 * the release registration a package needs to be publishable at all. These tests prevent them
 * from drifting.
 */

const packagesDir = join(import.meta.dirname, "..", "..");
const repoRoot = join(packagesDir, "..");

const readManifest = (packageName: string) =>
  JSON.parse(readFileSync(join(packagesDir, packageName, "package.json"), "utf8"));

const manifests = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => [entry.name, readManifest(entry.name)] as const);

const majorOf = (versionOrRange: string) => Number(versionOrRange.replace("^", "").split(".")[0]);

describe("workspace manifests", () => {
  describe("core peer ranges", () => {
    const declared = manifests.filter(
      ([, manifest]) => manifest.peerDependencies?.["@time-provider/core"] !== undefined,
    );
    const ranges = declared.map(
      ([, manifest]) => manifest.peerDependencies["@time-provider/core"] as string,
    );

    test("every package that peers on core declares the same range", () => {
      // A range bumped in ten packages and missed in the eleventh publishes one package that
      // resolves an incompatible core. Comparing them to each other catches that without
      // hard-coding which packages exist.
      expect(new Set(ranges).size).toBe(1);
    });

    test.each(declared)("%s pins a whole core major", (_packageName, manifest) => {
      // `^N.0.0` is the convention the repo has always used, and it is what makes the major
      // comparison below meaningful.
      expect(manifest.peerDependencies["@time-provider/core"]).toMatch(/^\^\d+\.0\.0$/);
    });

    test("the declared range is not behind the core in this repo", () => {
      // Deliberately `toBeGreaterThanOrEqual` rather than equality: between a breaking change
      // landing and release-please cutting the release, the ranges point at the major core is
      // about to become while core's own version still reads the old one. Running ahead is the
      // correct intermediate state; falling behind never is.
      expect(majorOf(ranges[0])).toBeGreaterThanOrEqual(majorOf(readManifest("core").version));
    });
  });

  describe("node engines", () => {
    const published = manifests.filter(([, manifest]) => manifest.private === false);

    test.each(published)("%s states a node floor", (_packageName, manifest) => {
      // Without it npm installs the package onto any Node at all, including the ones where
      // `Symbol.dispose` is missing and `using` silently does nothing.
      expect(manifest.engines?.node).toBeDefined();
    });

    test("every published package states the same floor", () => {
      // Same reasoning as the peer ranges above: a floor raised in eleven packages and missed
      // in the twelfth is the case worth catching, and comparing them to each other does it
      // without hard-coding the value.
      expect(new Set(published.map(([, manifest]) => manifest.engines.node)).size).toBe(1);
    });
  });

  describe("release registration", () => {
    const releaseConfig = JSON.parse(
      readFileSync(join(repoRoot, "release-please-config.json"), "utf8"),
    );

    test.each(manifests.filter(([, manifest]) => manifest.private === false))(
      "%s is registered for release",
      (packageName) => {
        // A publishable package missing from this config is never versioned, tagged or
        // published, and nothing else in the repo notices.
        expect(Object.keys(releaseConfig.packages)).toContain(`packages/${packageName}`);
      },
    );
  });
});
