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

// TODO: once the packs emit source maps, match executed code to changed functions through them
// instead of by function name.
/** The names of the Time-Provider functions each scenario runs once, by scenario name. */
async function executedFunctions(): Promise<Map<string, Set<string>>> {
  const session = new Session();
  session.connect();
  await session.post("Profiler.enable");
  await session.post("Profiler.startPreciseCoverage", { callCount: true, detailed: false });
  const executed = new Map<string, Set<string>>();
  try {
    for (const [scenarios, adaptersFor] of SUITES) {
      for (const scenario of scenarios) {
        await session.post("Profiler.takePreciseCoverage");
        for (const adapter of adaptersFor(scenario.advanceDelaysMs ?? [])) {
          await runOnce(adapter, scenario);
        }
        const { result } = await session.post("Profiler.takePreciseCoverage");
        const names = executed.get(scenario.name) ?? new Set();
        executed.set(scenario.name, names);
        for (const { url, functions } of result) {
          if (!/\/packages\/[^/]+\/dist\//.test(url)) continue;
          for (const { functionName, ranges } of functions) {
            if (ranges[0].count > 0) names.add(functionName.replace(/\$\d+$/, ""));
          }
        }
      }
    }
  } finally {
    session.disconnect();
  }
  return executed;
}

async function runOnce(adapter: ITimerAdapter, scenario: Scenario): Promise<void> {
  if (scenario.requires?.some((member) => adapter[member] === undefined)) return;
  adapter.setup();
  try {
    await scenario.run(adapter);
  } finally {
    adapter.teardown();
  }
}

/**
 * The scenarios running a function of `files` changed since `sha`, printing the skipped ones, or
 * undefined when code outside a function changed.
 */
export async function scenariosToGate(
  root: string,
  sha: string,
  files: string[],
): Promise<string[] | undefined> {
  const changed = changedFunctions(root, sha, files);
  if (changed.has("")) {
    console.log(`Code outside a function changed since ${sha}: every scenario runs.`);
    return undefined;
  }
  if (changed.size === 0) return [];
  console.log(`Functions changed since ${sha}: ${[...changed].join(", ")}`);
  const kept: string[] = [];
  for (const [scenario, names] of await executedFunctions()) {
    if ([...changed].some((name) => names.has(name))) kept.push(scenario);
    else console.log(`- ${scenario}: skipped, runs none of the changed functions`);
  }
  return kept;
}
