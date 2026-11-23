import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Side = "left" | "right";

export type SampleTimings = Record<
  string,
  Record<Side, Record<string, number>> & { measuredWith: string; version: string }
>;

export const pages = { "vs-sinon": "sinon", "vs-jest": "jest" } as const;
export const timingsFile = fileURLToPath(new URL("cache/sample-timings.json", import.meta.url));

const placeholder = "roughly measured to run in ? ms";

export function mapSampleBlocks(md: string, map: (code: string, side: Side) => string): string {
  return md.replace(/<div class="tp-compare">[\s\S]*?\n<\/div>\n<\/div>/g, (pair) => {
    const count = pair.match(/```ts\n/g)?.length ?? 0;
    let index = 0;
    return pair.replace(/(```ts\n)([\s\S]*?)```/g, (_, open: string, code: string) => {
      const side = count === 2 && index++ === 0 ? "left" : "right";
      return `${open}${map(code, side)}\`\`\``;
    });
  });
}

function fill(md: string, page: string, timings: SampleTimings): string {
  const filled = mapSampleBlocks(md, (code, side) => {
    let name = "";
    return code.replace(/^.*$/gm, (line) => {
      name = /^it(?:\.failing)?\("(.+?)"/.exec(line)?.[1] ?? name;
      if (!line.includes(placeholder)) return line;
      const ms = timings[page]?.[side][name];
      if (ms === undefined) throw new Error(`No timing for ${page} ${side} "${name}"`);
      return line.replace(placeholder, `roughly measured to run in ${ms.toFixed(1)} ms`);
    });
  });
  return filled
    .replace("<!-- measured-with -->", timings[page]!.measuredWith)
    .replace("<!-- version -->", timings[page]!.version);
}

export function sampleTimings() {
  return {
    name: "sample-timings",
    enforce: "pre" as const,
    transform(md: string, id: string) {
      const page = Object.keys(pages).find((name) => id.endsWith(`/guide/${name}.md`));
      if (!page || !existsSync(timingsFile)) return;
      return fill(md, page, JSON.parse(readFileSync(timingsFile, "utf8")));
    },
  };
}
