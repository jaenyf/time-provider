/**
 * Runs the full multi-pass benchmark suite and prepends a dated entry with the results to BENCHMARK.md at the repo root
 *
 * `TIMEPROVIDER_BENCH_PASSES` controls how many independent passes to run (default 5, same as
 * run-multi.ts). GITHUB_SHA is used for the commit reference when present (CI); otherwise it
 * falls back to the local git HEAD, so a manual local run still produces a sensible entry.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runAllPasses } from "./run-multi.ts";
import { buildScenarioRows, groupSamples, passCountFor, readSamples } from "./shared/aggregate.ts";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const BENCHMARK_MD = fileURLToPath(new URL("../../../BENCHMARK.md", import.meta.url));

const START_MARKER = "<!-- benchmark-history:start -->";
const END_MARKER = "<!-- benchmark-history:end -->";

function currentCommitRef(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO_ROOT })
    .toString()
    .trim();
}

function formatEntry(): string {
  const byScenario = groupSamples(readSamples());
  const timestamp = new Date().toISOString();
  const commitRef = currentCommitRef();

  const commitLink = `([${commitRef}](${commitRef}))`;
  const lines: string[] = [`## ${timestamp} - ${commitLink}`, ""];

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
    lines.push("");

    if (rows.length > 1) {
      const [fastest, ...rest] = rows;
      lines.push(
        `**${fastest.adapter.startsWith("time-provider") ? "✅" : "❌"} ${fastest.adapter}** is fastest:`,
      );
      for (const row of rest) {
        lines.push(`- ${(fastest.hz / row.hz).toFixed(2)}x faster than ${row.adapter}`);
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

const totalPasses = Number(process.env.TIMEPROVIDER_BENCH_PASSES ?? 5);
runAllPasses(totalPasses);

const entry = formatEntry();
const existing = existsSync(BENCHMARK_MD) ? readFileSync(BENCHMARK_MD, "utf8") : undefined;
writeFileSync(BENCHMARK_MD, upsertEntry(existing, entry));
console.log(`\nUpdated ${BENCHMARK_MD}`);
