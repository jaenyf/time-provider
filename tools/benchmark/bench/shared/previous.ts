import { fileURLToPath } from "node:url";

export const BENCHMARK_MD = fileURLToPath(new URL("../../../../BENCHMARK.md", import.meta.url));
export const START_MARKER = "<!-- benchmark-history:start -->";

export interface PreviousScenario {
  hz: Map<string, number>;
  fastest?: string;
  ratios: Map<string, number>;
}

export function previousScenarios(content: string | undefined): Map<string, PreviousScenario> {
  const byScenario = new Map<string, PreviousScenario>();
  const entry = content?.split(START_MARKER)[1]?.split(/\n## /)[1] ?? "";
  let current: PreviousScenario = { hz: new Map(), ratios: new Map() };
  for (const line of entry.split("\n")) {
    const scenario = /^### (.+?) _\(/.exec(line)?.[1];
    if (scenario) byScenario.set(scenario, (current = { hz: new Map(), ratios: new Map() }));
    const row = /^\| (.+?) +\| +([\d.]+) +\|/.exec(line);
    if (row) current.hz.set(row[1]!, Number(row[2]));
    current.fastest = /^\*\*\S+ (.+)\*\* is fastest:/.exec(line)?.[1] ?? current.fastest;
    const ratio = /^- ([\d.]+)x faster than (.+?)(?: \([+-][\d.]+%, previous was [\d.]+x\))?$/.exec(
      line,
    );
    if (ratio) current.ratios.set(ratio[2]!, Number(ratio[1]));
  }
  return byScenario;
}

export function previousRatio(
  previous: PreviousScenario | undefined,
  fastest: string,
  other: string,
) {
  if (previous?.fastest === fastest && previous.ratios.has(other))
    return previous.ratios.get(other);
  return previous && previous.hz.get(fastest)! / previous.hz.get(other)!;
}

export function delta(ratio: number, previous: number): string {
  const change = Number(((ratio / previous - 1) * 100).toFixed(1));
  return ` (${change < 0 ? "-" : "+"}${Math.abs(change).toFixed(1)}%, previous was ${previous.toFixed(2)}x)`;
}
