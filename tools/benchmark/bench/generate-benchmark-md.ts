/**
 * Runs the full multi-pass benchmark suite and prepends a dated entry with the results to BENCHMARK.md at the repo root
 *
 * `passes:N` sets how many independent passes to run (default 5, same as run-multi.ts).
 * GITHUB_SHA is used for the commit reference when present (CI); otherwise it falls back to the
 * local git HEAD, so a manual local run still produces a sensible entry.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runAllPasses } from "./run-multi.ts";
import { args } from "./shared/args.ts";
import {
  buildScenarioRows,
  groupSamples,
  passCountFor,
  readSamples,
  unsupportedAdapters,
} from "./shared/aggregate.ts";
import {
  BENCHMARK_MD,
  START_MARKER,
  delta,
  previousRatio,
  previousScenarios,
  type PreviousScenario,
} from "./shared/previous.ts";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const END_MARKER = "<!-- benchmark-history:end -->";

function currentCommitRef(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO_ROOT })
    .toString()
    .trim();
}

function versionsLine(): string {
  const require = createRequire(import.meta.url);
  const version = (name: string) => `${name} ${require(`${name}/package.json`).version}`;
  return [
    `Benchmarked with: Node ${process.version}`,
    version("@time-provider/core"),
    version("@sinonjs/fake-timers"),
    version("@jest/fake-timers"),
  ].join(" · ");
}

function formatEntry(previous: Map<string, PreviousScenario>): string {
  const byScenario = groupSamples(readSamples());
  const timestamp = new Date().toISOString();
  const commitRef = currentCommitRef();

  const commitLink = `([${commitRef}](https://github.com/jaenyf/time-provider/commit/${commitRef}))`;
  const lines: string[] = [`## ${timestamp} - ${commitLink}`, "", versionsLine(), ""];

  for (const [scenario, byAdapter] of byScenario) {
    const rows = buildScenarioRows(byAdapter);
    const passCount = passCountFor(byAdapter);

    lines.push(`### ${scenario} _(median across ${passCount} pass${passCount === 1 ? "" : "es"})_`);
    //lines.push(`_median across ${passCount} pass${passCount === 1 ? "" : "es"}_`);
    lines.push("");
    lines.push("| name | hz | mean (ms) | p99 (ms) | samples |");
    lines.push("| --- | ---: | ---: | ---: | ---: |");
    for (const row of rows) {
      lines.push(
        `| ${row.adapter} | ${row.hz.toFixed(2)} | ${row.mean.toFixed(4)} | ${row.p99.toFixed(4)} | ${row.samples} |`,
      );
    }
    for (const adapter of unsupportedAdapters(byAdapter)) {
      lines.push(`| ${adapter} | -- | -- | -- | -- |`);
    }
    lines.push("");

    if (rows.length > 1) {
      const [fastest, ...rest] = rows;
      lines.push(
        `**${fastest.adapter.startsWith("time-provider") ? "✅" : "❌"} ${fastest.adapter}** is fastest:`,
      );
      for (const row of rest) {
        const ratio = (fastest.hz / row.hz).toFixed(2);
        const before = previousRatio(previous.get(scenario), fastest.adapter, row.adapter);
        lines.push(
          `- ${ratio}x faster than ${row.adapter}${before ? delta(fastest.hz / row.hz, before) : ""}`,
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function upsertEntry(existingContent: string | undefined, newEntry: string): string {
  if (existingContent?.includes(START_MARKER) && existingContent.includes(END_MARKER)) {
    return existingContent.replace(START_MARKER, `${START_MARKER}\n\n${newEntry}`);
  }

  const intro = [
    "# Benchmark History",
    "",
    "Auto-generated and triggered by [last release](https://github.com/jaenyf/time-provider/actions/workflows/release-please.yml).  ",
  ].join("\n");
  return `${intro}\n${START_MARKER}\n\n${newEntry}\n${END_MARKER}\n`;
}

const totalPasses = Number(args.passes ?? 5);
runAllPasses(totalPasses);

const existing = existsSync(BENCHMARK_MD) ? readFileSync(BENCHMARK_MD, "utf8") : undefined;
const entry = formatEntry(previousScenarios(existing));
writeFileSync(BENCHMARK_MD, upsertEntry(existing, entry));
console.log(`\nUpdated ${BENCHMARK_MD}`);
