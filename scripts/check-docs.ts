#!/usr/bin/env node
// Fails when a package's documentation falls short of what JSR scores it on:
//   1. every symbol an entry point exports has JSDoc;
//   2. every entry point has a `@module` doc. JSR would fall back to the
//      README for ".", but every entry point carries one for consistency.
// `deno doc --lint` is stricter than JSR (every member, no private types
// referenced by public ones), so this reads `deno doc --json` instead.
//
// Run it from a package directory with Node 24+ and Deno on the PATH:
// node ../../scripts/check-docs.ts

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

interface DenoDocLocation {
  filename: string;
  line: number;
  col: number;
}

interface DenoDocDeclaration {
  declarationKind: string;
  kind: string;
  location: DenoDocLocation;
  jsDoc?: unknown;
  def?: { target?: DenoDocLocation };
}

interface DenoDocSymbol {
  name: string;
  declarations: DenoDocDeclaration[];
}

interface DenoDocModule {
  module_doc?: unknown;
  symbols: DenoDocSymbol[];
}

const { exports } = JSON.parse(readFileSync("deno.json", "utf8")) as {
  exports: Record<string, string>;
};

const problems: string[] = [];
for (const [entry, file] of Object.entries(exports)) {
  // Entry points are documented one at a time: together, `deno doc` turns a
  // symbol both export into a reference without its own JSDoc.
  const output = execFileSync("deno", ["doc", "--json", file], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const { nodes } = JSON.parse(output) as { nodes: Record<string, DenoDocModule> };
  const [{ module_doc, symbols }] = Object.values(nodes);

  if (!module_doc) {
    problems.push(`${entry}: no @module doc`);
  }
  // `export default x` is a reference to `x`'s declaration, documented when `x` is.
  const key = ({ filename, line, col }: DenoDocLocation) => `${filename}:${line}:${col}`;
  const documented = new Set(
    symbols.flatMap(({ declarations }) =>
      declarations.filter(({ jsDoc }) => jsDoc).map(({ location }) => key(location)),
    ),
  );
  const isDocumented = (declaration: DenoDocDeclaration) =>
    declaration.kind === "reference"
      ? declaration.def?.target !== undefined && documented.has(key(declaration.def.target))
      : declaration.jsDoc !== undefined;

  for (const { name, declarations } of symbols) {
    // A private declaration is an unexported type an export's signature leaks; JSR doesn't count it.
    const exported = declarations.filter(({ declarationKind }) => declarationKind !== "private");
    if (exported.length > 0 && !exported.some(isDocumented)) {
      problems.push(`${entry}: ${name} has no JSDoc`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
