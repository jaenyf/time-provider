import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import {
  mapSampleBlocks,
  pages,
  timingsFile,
  type SampleTimings,
  type Side,
} from "../.vitepress/sample-timings.ts";

const runs = 7;
const website = new URL("..", import.meta.url).pathname;
const outDir = join(website, ".vitepress/cache/samples");
const timesFile = join(outDir, "times.json");
const require = createRequire(import.meta.url);
const version = (name: string) => require(`${name}/package.json`).version as string;

function testFile(blocks: string[], shared: string[], header: string[], fails: string): string {
  const imports: string[] = [];
  const bodies = blocks.map((block, index) => {
    const code = block
      .replace("{ addon }", `{ addon as addon${index} }`)
      .replace(".use(addon)", `.use(addon${index})`)
      .replace(/^it\(([\s\S]*?\/\/ never settles[\s\S]*?\n)\}\);/m, `it.${fails}($1}, 300);`);
    const lines = code.split("\n");
    imports.push(...lines.filter((line) => line.startsWith("import ")));
    return lines.filter((line) => !line.startsWith("import ")).join("\n");
  });
  return [...header, ...imports, ...shared, ...bodies].join("\n");
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const [page, framework] of Object.entries(pages)) {
  const md = readFileSync(join(website, "guide", `${page}.md`), "utf8");
  const shared = [
    ...md.matchAll(/::: details The in-memory database[\s\S]*?```ts\n([\s\S]*?)```/g),
  ];
  const blocks: Record<Side, string[]> = { left: [], right: [] };
  mapSampleBlocks(md, (code, side) => {
    blocks[side].push(code);
    return code;
  });
  const jest = framework === "jest";
  const header = jest
    ? ["/** @jest-environment jsdom */", "afterEach(() => jest.useRealTimers());"]
    : ["afterEach(() => sinon.restore());"];
  const fails = jest ? "failing" : "fails";
  const dir = join(outDir, jest ? "jest" : "vitest");
  const sharedCode = shared.map((match) => match[1]!);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${page}-left.test.ts`),
    testFile(blocks.left, sharedCode, header, fails),
  );
  writeFileSync(join(dir, `${page}-right.test.ts`), testFile(blocks.right, sharedCode, [], fails));
}

const setupFiles = ["browser-globals.ts", "timing.ts"].map((file) =>
  join(website, "scripts/samples", file),
);
writeFileSync(
  join(outDir, "vitest/vitest.config.mjs"),
  `export default ${JSON.stringify({ test: { globals: true, pool: "threads", fileParallelism: false, setupFiles } })};`,
);

const jestConfig = {
  rootDir: join(outDir, "jest"),
  testEnvironment: "node",
  setupFiles: [setupFiles[0]],
  setupFilesAfterEnv: [setupFiles[1]],
  transform: {
    "^.+\\.ts$": [
      require.resolve("@swc/jest"),
      { jsc: { parser: { syntax: "typescript" }, target: "es2022" } },
    ],
  },
};

const vitestDir = join(outDir, "vitest");
const commands = [
  [require.resolve("jest/bin/jest"), "--config", JSON.stringify(jestConfig), "--runInBand"],
  [join(dirname(require.resolve("vitest/package.json")), "vitest.mjs"), "run", "--root", vitestDir],
];

for (let run = 0; run < runs; run++) {
  for (const args of commands) {
    const { status } = spawnSync(process.execPath, args, {
      stdio: "inherit",
      env: { ...process.env, TIMES_OUT: timesFile },
    });
    if (status !== 0) process.exit(status ?? 1);
  }
}

const median = (values: number[]) => values.toSorted((a, b) => a - b)[values.length >> 1]!;
const times: Record<string, Record<string, number[]>> = JSON.parse(readFileSync(timesFile, "utf8"));
const commit = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8" }).trim();
const commonVersions = [
  `node ${process.version}`,
  `@time-provider/core v${version("@time-provider/core")} (from main, [${commit}](https://github.com/jaenyf/time-provider/commit/${commit}))`,
];
const measuredOn = new Date().toISOString().slice(0, 10);

const timings: SampleTimings = {};
for (const [page, framework] of Object.entries(pages)) {
  const medians = (side: Side) =>
    Object.fromEntries(
      Object.entries(times[`${page}-${side}`] ?? {}).map(([name, ms]) => [name, median(ms)]),
    );
  const runner = framework === "jest" ? [] : [`vitest v${version("vitest")}`];
  const versions = [...commonVersions, ...runner, `${framework} v${version(framework)}`];
  timings[page] = {
    measuredWith: `Measured on ${measuredOn} with: ${versions.join(" · ")}`,
    version: version(framework),
    left: medians("left"),
    right: medians("right"),
  };
}
writeFileSync(timingsFile, JSON.stringify(timings, null, 2));
