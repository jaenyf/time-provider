/**
 * Runs `passes:N` benchmark passes (default 2) with each Time-Provider adapter also running on the
 * build of the newest BENCHMARK.md entry's commit, and fails when one is more than
 * `percentThreshold:N` percent (default 5) slower than its baseline on the same machine.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAllPasses } from "./run-multi.ts";
import { buildScenarioRows, groupSamples, readSamples } from "./shared/aggregate.ts";
import { BASELINE_SUFFIX } from "./shared/baseline.ts";
import { BENCHMARK_MD, START_MARKER } from "./shared/previous.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PACKAGES = ["core", "plugin-native", "addon-idle", "addon-animation-frame"];
const PREFIX = "time-provider-baseline-";

/** Builds the bench's packages at `sha` into a folder, reused in CI when its cache restored it. */
function prepareBaseline(sha: string): string {
  const parent = process.env.RUNNER_TEMP ?? tmpdir();
  const directory = join(parent, PREFIX + sha);
  if (process.env.CI && existsSync(join(directory, "kit.mjs"))) return directory;
  for (const leftover of readdirSync(parent).filter((name) => name.startsWith(PREFIX))) {
    rmSync(join(parent, leftover), { recursive: true, force: true });
  }
  execFileSync("git", ["worktree", "prune"], { cwd: ROOT });
  const worktree = join(directory, "worktree");
  execFileSync("git", ["worktree", "add", "--detach", worktree, sha], {
    cwd: ROOT,
    stdio: "ignore",
  });
  try {
    symlinkSync(join(ROOT, "node_modules"), join(worktree, "node_modules"));
    for (const name of PACKAGES) {
      const source = join(worktree, "packages", name);
      const target = join(directory, "node_modules", "@time-provider", name);
      execFileSync("vp", ["pack"], { cwd: source, stdio: ["ignore", "ignore", "inherit"] });
      cpSync(join(source, "dist"), join(target, "dist"), { recursive: true });
      copyFileSync(join(source, "package.json"), join(target, "package.json"));
    }
    copyFileSync(new URL("shared/adapters/kit.ts", import.meta.url), join(directory, "kit.mjs"));
  } finally {
    execFileSync("git", ["worktree", "remove", "--force", worktree], { cwd: ROOT });
  }
  return directory;
}

const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.split(":")));
const maxLoss = Number(args.percentThreshold ?? 5);
const entry = readFileSync(BENCHMARK_MD, "utf8").split(START_MARKER)[1] ?? "";
const sha = /^## .*?\(\[([0-9a-f]+)\]/m.exec(entry)?.[1];
if (!sha || spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: ROOT }).status !== 0) {
  console.log(
    `Baseline commit ${sha ?? "(none in BENCHMARK.md)"} is not in the local history: gate skipped.`,
  );
  process.exit(0);
}

const directory = prepareBaseline(sha);
try {
  process.env.TIMEPROVIDER_BENCH_BASELINE = directory;
  runAllPasses(Number(args.passes ?? 2));
} finally {
  if (!process.env.CI) rmSync(directory, { recursive: true, force: true });
}

const losses: string[] = [];
console.log(`\nTime-Provider against its ${sha} build, same machine:`);
for (const [scenario, byAdapter] of groupSamples(readSamples())) {
  const rows = new Map(buildScenarioRows(byAdapter).map((row) => [row.adapter, row]));
  for (const [adapter, head] of rows) {
    if (!adapter.startsWith("time-provider") || adapter.endsWith(BASELINE_SUFFIX)) continue;
    const baseline = rows.get(adapter + BASELINE_SUFFIX);
    if (!baseline) {
      console.log(`- ${scenario}: ${adapter} has no baseline (API not in ${sha}), skipped`);
      continue;
    }
    const change = Number(((head.hz / baseline.hz - 1) * 100).toFixed(1));
    const line = `${scenario}: ${adapter} ${change < 0 ? "" : "+"}${change.toFixed(1)}%`;
    console.log(`- ${line}`);
    if (change < -maxLoss) losses.push(line);
  }
}

if (losses.length > 0) {
  console.log(
    `\nSlower than ${sha} by more than ${maxLoss}%:\n${losses.map((loss) => `- ${loss}`).join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(`\nNo scenario is more than ${maxLoss}% slower than ${sha}.`);
}
