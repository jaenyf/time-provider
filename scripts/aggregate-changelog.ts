#!/usr/bin/env node
// Regenerates the *generated section* of the root CHANGELOG.md by
// concatenating every package's own CHANGELOG.md (each maintained by
// release-please). Anything outside the AGGREGATE_START/AGGREGATE_END
// markers - e.g. hand-written history predating the per-package changelogs
// - is preserved untouched. On a first run against a file that doesn't have
// the markers yet, the existing content is kept as-is below the generated
// section rather than discarded.
//
// Editing packages/<name>/CHANGELOG.md is still the source of truth for
// generated entries (release-please owns those); only the generated section
// of the root file should be considered auto-managed.
//
// Run directly with Node 24+ (native TypeScript type stripping, no build
// step required): node scripts/aggregate-changelog.ts

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, "packages");
const OUTPUT_PATH = join(ROOT, "CHANGELOG.md");

const START_MARKER = "<!-- aggregate-changelog:start -->";
const END_MARKER = "<!-- aggregate-changelog:end -->";

interface ChangelogEntry {
  version: string;
  date: string;
  body: string[];
}

interface AggregatedEntry extends ChangelogEntry {
  packageName: string;
}

// Matches release-please's version headers, e.g.:
//   ## [1.0.1](https://.../compare/core-v1.0.0...core-v1.0.1) (2026-07-16)
//   ## 1.0.1 (2026-07-16)
const HEADER_REGEX =
  /^## (?:\[(?<version>[^\]]+)\]\([^)]*\)|(?<versionPlain>\S+)) \((?<date>\d{4}-\d{2}-\d{2})\)\s*$/;

function readPackageName(pkgDir: string): string {
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as {
    name: string;
  };
  return pkgJson.name;
}

function parseChangelog(changelogPath: string): ChangelogEntry[] {
  const lines = readFileSync(changelogPath, "utf8").split("\n");
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const line of lines) {
    const match = line.match(HEADER_REGEX);
    if (match?.groups) {
      if (current) entries.push(current);
      current = {
        version: match.groups.version ?? match.groups.versionPlain,
        date: match.groups.date,
        body: [],
      };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) entries.push(current);

  for (const entry of entries) {
    while (entry.body.length && entry.body[0].trim() === "") entry.body.shift();
    while (entry.body.length && entry.body.at(-1)?.trim() === "") entry.body.pop();
  }

  return entries;
}

/**
 * Returns whatever should be preserved verbatim below the generated
 * section: content that was already after END_MARKER on a previous run, or
 * - if the markers aren't present yet - the pre-existing file's body (sans
 * its top-level title), so a first run migrates rather than deletes it.
 */
function extractPreservedContent(existingContent: string): string {
  const startIdx = existingContent.indexOf(START_MARKER);
  const endIdx = existingContent.indexOf(END_MARKER);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return existingContent.slice(endIdx + END_MARKER.length).trim();
  }

  return existingContent.replace(/^#\s+Changelog\s*\n+/, "").trim();
}

function main(): void {
  const existingContent = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, "utf8") : "";
  const preserved = extractPreservedContent(existingContent);

  const packageDirNames = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const allEntries: AggregatedEntry[] = [];

  for (const dirName of packageDirNames) {
    const pkgDir = join(PACKAGES_DIR, dirName);
    const changelogPath = join(pkgDir, "CHANGELOG.md");
    // Packages without their own changelog (test, test-shared, test-e2e...)
    // are not release-please components - skip them.
    if (!existsSync(changelogPath)) continue;

    const packageName = readPackageName(pkgDir);
    for (const entry of parseChangelog(changelogPath)) {
      allEntries.push({ ...entry, packageName });
    }
  }

  const byDate = new Map<string, AggregatedEntry[]>();
  for (const entry of allEntries) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date)?.push(entry);
  }
  const datesNewestFirst = [...byDate.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const out: string[] = [
    "# Changelog",
    "",
    "> Aggregated view of every published package's changelog, generated automatically from " +
      "`packages/*/CHANGELOG.md` after each release. Only the section between the markers " +
      "below is auto-managed - edit the relevant package's own changelog instead of editing " +
      "it directly.",
    "",
    START_MARKER,
  ];

  for (const date of datesNewestFirst) {
    out.push("", `## ${date}`);
    const entries = (byDate.get(date) ?? []).sort((a, b) =>
      a.packageName.localeCompare(b.packageName),
    );
    for (const entry of entries) {
      out.push("", `### ${entry.packageName} ${entry.version}`, "", ...entry.body);
    }
  }

  out.push("", END_MARKER);

  if (preserved) {
    out.push("", preserved);
  }

  writeFileSync(OUTPUT_PATH, out.join("\n") + "\n");
}

main();
