import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { Session } from "node:inspector/promises";
import { join } from "node:path";
import { parseSync } from "vite-plus";
import type { ITimerAdapter } from "./adapters/ITimerAdapter.ts";
import { TimeProviderCompatAdapter } from "./adapters/TimeProviderCompatAdapter.ts";
import { TimeProviderFixedAdapter } from "./adapters/TimeProviderFixedAdapter.ts";
import { TimeProviderManualAdapter } from "./adapters/TimeProviderManualAdapter.ts";
import { TimeProviderSequentialAdapter } from "./adapters/TimeProviderSequentialAdapter.ts";
import {
  asyncScenarios,
  clockReadScenarios,
  schedulingScenarios,
  type Scenario,
} from "./scenarios.ts";

type Program = ReturnType<typeof parseSync>["program"];
type Node = { start: number; end: number };
type ClassMember = Extract<
  Program["body"][number],
  { superClass: unknown }
>["body"]["body"][number];

/** The Time-Provider adapters each bench file runs a scenario list with. */
const SUITES: [Scenario[], (delaysMs: number[]) => ITimerAdapter[]][] = [
  [
    schedulingScenarios,
    (delaysMs) => [
      new TimeProviderManualAdapter(delaysMs),
      new TimeProviderSequentialAdapter(delaysMs),
      new TimeProviderCompatAdapter(delaysMs),
    ],
  ],
  [asyncScenarios, (delaysMs) => [new TimeProviderManualAdapter(delaysMs)]],
  [
    clockReadScenarios,
    () => [
      new TimeProviderManualAdapter(),
      new TimeProviderFixedAdapter(),
      new TimeProviderCompatAdapter(),
    ],
  ],
];

/** The name V8 gives a class member's function, or the class's own for a field initialized in it. */
function memberName(member: ClassMember, className: string, source: string): string {
  if (member.type === "MethodDefinition") {
    if (member.kind === "constructor") return className;
    const name = keyName(member.key, source);
    return member.kind === "method" ? name : `${member.kind} ${name}`;
  }
  if (member.type !== "PropertyDefinition") return "";
  const type = member.value?.type;
  if (type === "ArrowFunctionExpression" || type === "FunctionExpression") {
    return keyName(member.key, source);
  }
  return member.static ? "" : className;
}

function keyName(key: Node & { type: string }, source: string): string {
  const name = "name" in key ? String(key.name) : "";
  if (key.type === "Identifier") return name;
  if (key.type === "PrivateIdentifier") return `#${name}`;
  return `[${source.slice(key.start, key.end)}]`;
}

/**
 * The code of each top-level function, method and class constructor in `source`, by the name V8
 * gives it; any other code that runs (module-level statements, static members) goes under "".
 */
function functionCode(path: string, source: string): Map<string, string> {
  const code = new Map<string, string>();
  const add = (name: string, node: Node) =>
    code.set(name, (code.get(name) ?? "") + source.slice(node.start, node.end));
  const { program, errors } = parseSync(path, source);
  if (errors.length > 0) add("", program);
  for (const statement of program.body) {
    const node =
      (statement.type === "ExportNamedDeclaration" ||
        statement.type === "ExportDefaultDeclaration") &&
      statement.declaration
        ? statement.declaration
        : statement;
    if (node.type === "FunctionDeclaration") add(node.id?.name ?? "", node);
    else if (node.type === "ClassDeclaration" && !node.declare) {
      for (const member of node.body.body) {
        if (member.type === "PropertyDefinition" && member.declare) continue;
        if (member.type.startsWith("TS")) continue;
        add(memberName(member, node.id?.name ?? "", source), member);
      }
    } else if (node.type === "VariableDeclaration" && !node.declare) {
      for (const declarator of node.declarations) {
        const isFunction =
          declarator.init?.type === "ArrowFunctionExpression" ||
          declarator.init?.type === "FunctionExpression";
        add(
          isFunction && declarator.id.type === "Identifier" ? declarator.id.name : "",
          declarator,
        );
      }
    } else if (!isDeclarationOnly(node)) add("", node);
  }
  return code;
}

/** Whether `node` emits no code: an import, a re-export or a type. */
function isDeclarationOnly(node: { type: string; declare?: boolean }): boolean {
  return (
    node.type === "ImportDeclaration" ||
    node.type === "ExportAllDeclaration" ||
    node.type === "ExportNamedDeclaration" ||
    (node.type.startsWith("TS") && node.type !== "TSEnumDeclaration") ||
    node.declare === true
  );
}

/** The names of the functions whose code differs between `sha` and the working tree in `files`. */
function changedFunctions(root: string, sha: string, files: string[]): Set<string> {
  const changed = new Set<string>();
  for (const file of files) {
    if (!file.endsWith(".ts")) {
      changed.add("");
      continue;
    }
    const path = join(root, file);
    const head = existsSync(path) ? functionCode(file, readFileSync(path, "utf8")) : new Map();
    const shown = spawnSync("git", ["show", `${sha}:${file}`], { cwd: root, encoding: "utf8" });
    const base = shown.status === 0 ? functionCode(file, shown.stdout) : new Map();
    for (const name of new Set([...head.keys(), ...base.keys()])) {
      if (head.get(name) !== base.get(name)) changed.add(name);
    }
  }
  return changed;
}

const BUILD_FIELDS = ["type", "exports", "main", "module", "types", "sideEffects", "dependencies"];

/** Whether the fields of `packages/<name>/package.json` that shape its build differ from `sha`. */
function buildFieldsChanged(root: string, sha: string, name: string): boolean {
  const file = `packages/${name}/package.json`;
  const shown = spawnSync("git", ["show", `${sha}:${file}`], { cwd: root, encoding: "utf8" });
  const fields = (json: string) => {
    const manifest = JSON.parse(json || "{}");
    return JSON.stringify(BUILD_FIELDS.map((field) => manifest[field]));
  };
  return fields(readFileSync(join(root, file), "utf8")) !== fields(shown.stdout);
}

/** What each scenario runs once, by scenario name: function names and the packages they're from. */
type Executed = Map<string, { functions: Set<string>; packages: Set<string> }>;

// TODO: once the packs emit source maps, match executed code to changed functions through them
// instead of by function name.
/** The Time-Provider code each scenario runs, recorded while it runs, not during setup or teardown. */
async function executedCode(): Promise<Executed> {
  const session = new Session();
  session.connect();
  await session.post("Profiler.enable");
  await session.post("Profiler.startPreciseCoverage", { callCount: true, detailed: false });
  const executed: Executed = new Map();
  try {
    for (const [scenarios, adaptersFor] of SUITES) {
      for (const scenario of scenarios) {
        const code = { functions: new Set<string>(), packages: new Set<string>() };
        executed.set(scenario.name, code);
        for (const adapter of adaptersFor(scenario.advanceDelaysMs ?? [])) {
          await runOnce(session, adapter, scenario, code);
        }
      }
    }
  } finally {
    session.disconnect();
  }
  return executed;
}

async function runOnce(
  session: Session,
  adapter: ITimerAdapter,
  scenario: Scenario,
  code: { functions: Set<string>; packages: Set<string> },
): Promise<void> {
  if (scenario.requires?.some((member) => adapter[member] === undefined)) return;
  adapter.setup();
  await session.post("Profiler.takePreciseCoverage");
  try {
    await scenario.run(adapter);
  } finally {
    const { result } = await session.post("Profiler.takePreciseCoverage");
    adapter.teardown();
    for (const { url, functions } of result) {
      const name = /\/packages\/([^/]+)\/dist\//.exec(url)?.[1];
      const ran = functions.filter(({ ranges }) => ranges[0].count > 0);
      if (!name || ran.length === 0) continue;
      code.packages.add(name);
      for (const { functionName } of ran) code.functions.add(functionName.replace(/\$\d+$/, ""));
    }
  }
}

/**
 * The scenarios to gate after the changes since `sha` to the measured `packages`, printing the
 * skipped ones: none when no source or build config of theirs changed, all of them (undefined)
 * when a root build config, the bench or code outside a function changed. A package's own build
 * config change keeps the scenarios running its code; a source change, those running a changed
 * function. Node and installed packages are the same for both builds, so they don't count.
 */
export async function scenariosToGate(
  root: string,
  sha: string,
  packages: string[],
): Promise<string[] | undefined> {
  const files = spawnSync("git", ["diff", "--name-only", sha], { cwd: root, encoding: "utf8" })
    .stdout.split("\n")
    .filter(Boolean);
  const shared = files.find((file) =>
    /^(tsconfig[^/]*\.json|vite\.config\.ts|tools\/benchmark\/.*)$/.test(file),
  );
  if (shared) {
    console.log(`${shared} changed since ${sha}: every scenario runs.`);
    return undefined;
  }
  const configured = packages.filter(
    (name) =>
      files.some((file) =>
        new RegExp(`^packages/${name}/(tsconfig[^/]*\\.json|vite\\.config\\.ts)$`).test(file),
      ) ||
      (files.includes(`packages/${name}/package.json`) && buildFieldsChanged(root, sha, name)),
  );
  const sources = files.filter((file) =>
    packages.some((name) => file.startsWith(`packages/${name}/src/`)),
  );
  const changed = changedFunctions(root, sha, sources);
  if (changed.has("")) {
    console.log(`Code outside a function changed since ${sha}: every scenario runs.`);
    return undefined;
  }
  if (changed.size === 0 && configured.length === 0) return [];
  if (configured.length > 0)
    console.log(`Build config changed since ${sha}: ${configured.join(", ")}`);
  if (changed.size > 0) console.log(`Functions changed since ${sha}: ${[...changed].join(", ")}`);
  const kept: string[] = [];
  for (const [scenario, code] of await executedCode()) {
    const runsChange =
      configured.some((name) => code.packages.has(name)) ||
      [...changed].some((name) => code.functions.has(name));
    if (runsChange) kept.push(scenario);
    else console.log(`- ${scenario}: skipped, runs none of the changed code`);
  }
  return kept;
}
