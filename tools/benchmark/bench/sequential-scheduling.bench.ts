import { bench, describe } from "vite-plus/test";
import { schedulingScenarios } from "./shared/scenarios.ts";
import { GlobalGuard } from "./shared/globalGuard.ts";
import { recordSample } from "./shared/measure.ts";
import { TimeProviderSequentialAdapter } from "./shared/adapters/TimeProviderSequentialAdapter.ts";
import { SinonFakeTimersAdapter } from "./shared/adapters/SinonFakeTimersAdapter.ts";
import { JestFakeTimersAdapter } from "./shared/adapters/JestFakeTimersAdapter.ts";
import { realNow } from "./shared/realNow.ts";

const guard = new GlobalGuard();
const adapters = [
  new TimeProviderSequentialAdapter(),
  new SinonFakeTimersAdapter(),
  new JestFakeTimersAdapter(),
];

for (const scenario of schedulingScenarios) {
  describe(scenario.name, () => {
    for (const adapter of adapters) {
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
      });
    }
  });
}
