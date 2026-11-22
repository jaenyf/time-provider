/**
 * Runs `passes:N` benchmark passes (default 2) with each Time-Provider adapter also running on the
 * build of the newest BENCHMARK.md entry's commit, and fails when one is more than
 * `percentThreshold:N` percent (default 5) slower than its baseline on the same machine.
 * When at most `retryLimit:N` rows (default 5) fail and none is more than `retryThreshold:N`
 * percent (default 20) slower, those scenarios run once more and only their new rows decide.
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
import { args } from "./shared/args.ts";
import { buildScenarioRows, groupSamples, readSamples } from "./shared/aggregate.ts";
import { BASELINE_SUFFIX } from "./shared/baseline.ts";
import { BENCHMARK_MD, START_MARKER } from "./shared/previous.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PACKAGES = ["core", "plugin-native", "addon-idle", "addon-animation-frame", "addon-compat"];
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

type Change = { scenario: string; adapter: string; change: number; line: string };

/** Runs the passes on the tests matching `testNamePattern` and prints each head row's change. */
function measure(testNamePattern?: string): Change[] {
  runAllPasses(passes, testNamePattern);
  const changes: Change[] = [];
  console.log(`\nTime-Provider against its ${sha} build, same machine:`);
  for (const [scenario, byAdapter] of groupSamples(readSamples())) {
    // An adapter skipped by `requires` records its own "--" row; one with no row ran fine.
    for (const [adapter, byPass] of byAdapter) {
      const head = adapter.slice(0, -BASELINE_SUFFIX.length);
      if (adapter.endsWith(BASELINE_SUFFIX) && byPass.size === 0 && !byAdapter.has(head)) {
        console.log(`- ${scenario}: ${head} has no baseline (API not in ${sha}), skipped`);
      }
    }
    const rows = new Map(buildScenarioRows(byAdapter).map((row) => [row.adapter, row]));
    for (const [adapter, head] of rows) {
      const baseline = rows.get(adapter + BASELINE_SUFFIX);
      if (!baseline) continue;
      const change = Number(((head.hz / baseline.hz - 1) * 100).toFixed(1));
      const line = `${scenario}: ${adapter} ${change < 0 ? "" : "+"}${change.toFixed(1)}%`;
      console.log(`- ${line}`);
      changes.push({ scenario, adapter, change, line });
    }
  }
  return changes;
}

const list = (changes: Change[]) => changes.map(({ line }) => `- ${line}`).join("\n");

const maxLoss = Number(args.percentThreshold ?? 5);
const retryLoss = Number(args.retryThreshold ?? 20);
const retryLimit = Number(args.retryLimit ?? 5);
const passes = Number(args.passes ?? 2);
const entry = readFileSync(BENCHMARK_MD, "utf8").split(START_MARKER)[1] ?? "";
const sha = /^## .*?\(\[([0-9a-f]+)\]/m.exec(entry)?.[1];
if (!sha || spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: ROOT }).status !== 0) {
  console.log(
    `Baseline commit ${sha ?? "(none in BENCHMARK.md)"} is not in the local history: gate skipped.`,
  );
  process.exit(0);
}

const directory = prepareBaseline(sha);
let losses: Change[];
try {
  process.env.TIMEPROVIDER_BENCH_BASELINE = directory;
  losses = measure().filter(({ change }) => change < -maxLoss);
  const retried = losses.filter(({ change }) => change >= -retryLoss);
  if (retried.length === losses.length && retried.length > 0 && retried.length <= retryLimit) {
    console.log(`\nRetrying, slower than ${sha} by more than ${maxLoss}%:\n${list(retried)}`);
    const keys = new Set(retried.map(({ scenario, adapter }) => scenario + adapter));
    const names = [...new Set(retried.map(({ scenario }) => scenario))];
    const pattern = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    losses = measure(pattern).filter(
      ({ scenario, adapter, change }) => keys.has(scenario + adapter) && change < -maxLoss,
    );
  }
} finally {
  if (!process.env.CI) rmSync(directory, { recursive: true, force: true });
}

if (losses.length > 0) {
  console.log(`\nSlower than ${sha} by more than ${maxLoss}%:\n${list(losses)}`);
  process.exitCode = 1;
} else {
  console.log(`\nNo scenario is more than ${maxLoss}% slower than ${sha}.`);
}
