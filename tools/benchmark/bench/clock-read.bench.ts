import { test } from "vite-plus/test";
import { clockReadScenarios } from "./shared/scenarios.ts";
import { GlobalGuard } from "./shared/globalGuard.ts";
import { prepareAdapters, progress, recordSample } from "./shared/measure.ts";
import { TimeProviderManualAdapter } from "./shared/adapters/TimeProviderManualAdapter.ts";
import { SinonFakeTimersAdapter } from "./shared/adapters/SinonFakeTimersAdapter.ts";
import { JestFakeTimersAdapter } from "./shared/adapters/JestFakeTimersAdapter.ts";
import { realNow } from "./shared/realNow.ts";
import { baselineKit } from "./shared/baseline.ts";

const guard = new GlobalGuard();
const adapters = [
  new TimeProviderManualAdapter(),
  ...(baselineKit
    ? [new TimeProviderManualAdapter([], baselineKit)]
    : [new SinonFakeTimersAdapter(), new JestFakeTimersAdapter()]),
];

for (const [index, scenario] of clockReadScenarios.entries()) {
  test(progress(index, clockReadScenarios.length) + scenario.name, async ({ bench }) => {
    const ready = prepareAdapters(adapters, scenario);
    // bench.compare() needs two rows: the gate's Time-Provider row alone has nothing to compare to.
    if (ready.length < 2) return;
    await bench.compare(
      ...ready.map((adapter) =>
        bench(adapter.name, () => {
          adapter.setup();
          const start = realNow();
          try {
            scenario.run(adapter);
          } finally {
            const elapsedMs = realNow() - start;
            adapter.teardown();
            guard.assertPristine(adapter.name);
            recordSample(adapter.name, scenario.name, elapsedMs);
          }
        }),
      ),
    );
  });
}
