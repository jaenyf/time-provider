/**
 * Runs `passes:N` benchmark passes (default 2) with each Time-Provider adapter also running on the
 * build of the newest BENCHMARK.md entry's commit, and fails when one is more than
 * `percentThreshold:N` percent (default 5) slower than its baseline on the same machine. Head and
 * baseline run in alternating blocks, the first one swapped on each pass, and each row is the
 * median of its passes' medians.
 * When at most `attemptsMaxFailingTests:N` tests (default 5) fail and none is more than
 * `attemptsMaxPercentLoss:N` percent (default 20) slower, the failing scenarios get up to
 * `attempts:N` tries in all (default 2), each with twice the passes of the one before. A test
 * fails only if it is too slow in every attempt and the 95% confidence interval of its last
 * attempt is entirely below the threshold; otherwise it passes as inconclusive.
 * The gate runs in full when a root build config or bench file changed since that commit.
 * Otherwise it only measures the scenarios that, while timed, run a function changed since then
 * (found by name in V8 coverage) or any code of a package whose own build config changed, and is
 * skipped when there is none.
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
import { logDurationOnExit } from "./shared/duration.ts";
import {
  buildScenarioRows,
  changeInterval,
  groupSamples,
  median,
  readSamples,
} from "./shared/aggregate.ts";
import { BASELINE_SUFFIX } from "./shared/baseline.ts";
import { scenariosToGate } from "./shared/changes.ts";
import { BENCHMARK_MD, START_MARKER } from "./shared/previous.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PACKAGES = [
  "core",
  "plugin-native",
  "addon-idle",
  "addon-animation-frame",
  "addon-compat",
  "addon-cron",
];
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

type Change = {
  scenario: string;
  adapter: string;
  change: number;
  low: number;
  high: number;
  line: string;
};

const key = ({ scenario, adapter }: { scenario: string; adapter: string }) => scenario + adapter;

/**
 * Runs `passCount` passes on the tests matching `testNamePattern` and prints each head row's
 * change, marking the rows outside `judged`, when given, as not retried.
 */
async function measure(
  passCount: number,
  testNamePattern?: string,
  judged?: Set<string>,
): Promise<Change[]> {
  await runAllPasses(passCount, testNamePattern);
  const changes: Change[] = [];
  console.log(`\nTime-Provider against its ${sha} build, same machine:`);
  for (const [scenario, byAdapter] of groupSamples(readSamples())) {
    // An adapter skipped by `requires` records its own "--" row; one with no row ran fine.
    for (const [adapter, byPass] of byAdapter) {
      const head = adapter.slice(0, -BASELINE_SUFFIX.length);
      if (adapter.endsWith(BASELINE_SUFFIX) && byPass.size === 0 && !byAdapter.has(head)) {
        console.log(
          `- ${scenario}: ${head} has no baseline (unsupported or failing in ${sha}), skipped`,
        );
      }
    }
    const rows = new Map(buildScenarioRows(byAdapter, median).map((row) => [row.adapter, row]));
    for (const [adapter, head] of rows) {
      const baseline = rows.get(adapter + BASELINE_SUFFIX);
      if (!baseline) continue;
      const change = round((head.hz / baseline.hz - 1) * 100);
      const [low, high] = changeInterval(
        byAdapter.get(adapter)!,
        byAdapter.get(adapter + BASELINE_SUFFIX)!,
      ).map(round);
      const line = `${scenario}: ${adapter} ${describe({ change, low, high })}`;
      const notRetried = judged && !judged.has(key({ scenario, adapter })) ? " (not retried)" : "";
      console.log(`- ${line}${notRetried}`);
      changes.push({ scenario, adapter, change, low, high, line });
    }
  }
  return changes;
}

const round = (value: number) => Number(value.toFixed(1));
const describe = ({ change, low, high }: Pick<Change, "change" | "low" | "high">) =>
  `${percent(change)} (95% CI ${percent(low)} .. ${percent(high)})`;
const percent = (change: number) => `${change < 0 ? "" : "+"}${change.toFixed(1)}%`;
const list = (changes: Change[]) => changes.map(({ line }) => `- ${line}`).join("\n");
const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

logDurationOnExit("bench:gate");

const maxLoss = Number(args.percentThreshold ?? 5);
const attemptsMaxPercentLoss = Number(args.attemptsMaxPercentLoss ?? 20);
const attemptsMaxFailingTests = Number(args.attemptsMaxFailingTests ?? 5);
const attempts = Number(args.attempts ?? 2);
const passes = Number(args.passes ?? 2);
const entry = readFileSync(BENCHMARK_MD, "utf8").split(START_MARKER)[1] ?? "";
const sha = /^## .*?\(\[([0-9a-f]+)\]/m.exec(entry)?.[1];
if (!sha || spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: ROOT }).status !== 0) {
  console.log(
    `Baseline commit ${sha ?? "(none in BENCHMARK.md)"} is not in the local history: gate skipped.`,
  );
  process.exit(0);
}

const scenarios = await scenariosToGate(ROOT, sha, PACKAGES);
if (scenarios?.length === 0) {
  console.log(`Nothing the gate measures changed since ${sha}: gate skipped.`);
  process.exit(0);
}

const directory = prepareBaseline(sha);
let losses: Change[];
let retry: boolean;
const history = new Map<string, Change[]>();
try {
  process.env.TIMEPROVIDER_BENCH_BASELINE = directory;
  losses = (await measure(passes, scenarios?.map(escape).join("|"))).filter(
    ({ change }) => change < -maxLoss,
  );
  for (const loss of losses) history.set(key(loss), [loss]);
  retry =
    losses.length <= attemptsMaxFailingTests &&
    losses.every(({ change }) => change >= -attemptsMaxPercentLoss);
  for (let attempt = 2; retry && attempt <= attempts && losses.length > 0; attempt++) {
    const attemptPasses = passes * 2 ** (attempt - 1);
    console.log(
      `\nAttempt ${attempt}/${attempts} with ${attemptPasses} passes, slower than ${sha} by more than ${maxLoss}%:\n${list(losses)}`,
    );
    const judged = new Set(losses.map(key));
    const pattern = [...new Set(losses.map(({ scenario }) => escape(scenario)))].join("|");
    losses = (await measure(attemptPasses, pattern, judged)).filter(
      (change) => judged.has(key(change)) && change.change < -maxLoss,
    );
    for (const loss of losses) history.get(key(loss))!.push(loss);
  }
} finally {
  if (!process.env.CI) rmSync(directory, { recursive: true, force: true });
}

const report = (changes: Change[]) =>
  changes
    .map((loss) => {
      const attemptChanges = history.get(key(loss))!;
      const all =
        attemptChanges.length > 1 ? ` (attempts: ${attemptChanges.map(describe).join(", ")})` : "";
      return `- ${loss.scenario}: ${loss.adapter} ${describe(loss)}${all}`;
    })
    .join("\n");
const failing = retry ? losses.filter(({ high }) => high < -maxLoss) : losses;
const inconclusive = losses.filter((loss) => !failing.includes(loss));
if (inconclusive.length > 0) {
  console.log(
    `\nInconclusive, the 95% CI reaches ${-maxLoss}% or better, not failed:\n${report(inconclusive)}`,
  );
}
if (failing.length > 0) {
  console.log(`\nSlower than ${sha} by more than ${maxLoss}%:\n${report(failing)}`);
  process.exitCode = 1;
} else {
  console.log(`\nNo scenario is surely more than ${maxLoss}% slower than ${sha}.`);
}
