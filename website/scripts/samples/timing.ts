// fallow-ignore-file unused-file
// This file is loaded dynamically by measure-samples.ts
import fs from "node:fs";
import path from "node:path";

type Test = (...args: unknown[]) => unknown;
declare let it: Test;
declare const afterAll: (fn: () => void) => void;
declare const expect: { getState(): { testPath: string } };

const realNow = performance.now.bind(performance);
const times: Record<string, number> = {};

const timed = (name: string, fn: Test) =>
  function (this: unknown, ...args: unknown[]) {
    const start = realNow();
    const result = fn.apply(this, args);
    const done = () => (times[name] = realNow() - start);
    if (result instanceof Promise) return result.finally(done);
    done();
    return result;
  };

it = new Proxy(it, {
  apply: (target, self, [name, fn, timeout]) => target.call(self, name, timed(name, fn), timeout),
});

afterAll(() => {
  const file = process.env.TIMES_OUT!;
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const key = path.basename(expect.getState().testPath, ".test.ts");
  all[key] ??= {};
  for (const [name, ms] of Object.entries(times)) (all[key][name] ??= []).push(ms);
  fs.writeFileSync(file, JSON.stringify(all));
});
