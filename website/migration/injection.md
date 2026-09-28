---
aside: false
---

# 3. Inject the Time-Provider

After steps 1 and 2 your code calls a Time-Provider, but it still imports the
one from `time-provider.ts`, so a test cannot swap it. Make it a parameter
instead: the code receives a Time-Provider, the app passes the real one, and a
test passes one whose clock it moves.

## Receive it

<div class="tp-compare">
<div>

**Imported**

```ts
import { timeProvider } from "./time-provider";

export function scheduleReminder(send: () => void) {
  timeProvider.scheduler.timers.once({ minutes: 5 }, send);
}
```

</div>
<div>

**Injected**

<!-- prettier-ignore -->
```ts
import type { IUtcOnlyTimeProvider } from "@time-provider/core";

export function scheduleReminder(
  timeProvider: IUtcOnlyTimeProvider<Date>,
  send: () => void,
) {
  timeProvider.scheduler.timers.once({ minutes: 5 }, send);
}
```

</div>
</div>

A class takes it in its constructor:

```ts
class ReminderService {
  constructor(private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}

  schedule(send: () => void) {
    this.timeProvider.scheduler.timers.once({ minutes: 5 }, send);
  }
}
```

`IUtcOnlyTimeProvider<TDate>` fits the UTC-only plugins, such as
`plugin-native`, and `ITimeProvider<TDate>` the timezone-aware ones (see
[Plugins](/plugins/)). Code still on compat takes
`IUtcOnlyTimeProvider<Date> & WithCompatApi<Date>`, imported from
`@time-provider/addon-compat`.

## Pass it from the entry point

Create the Time-Provider once, where the app starts, and hand it down.
`time-provider.ts` can go once nothing imports it.

```ts
// main.ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

const timeProvider = createTimeProvider.for(plugin).create();
const reminders = new ReminderService(timeProvider);
```

## Control it in tests

The same code now runs on a manual clock, with no fake timers to install or
restore:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

it("sends the reminder after five minutes", () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().withInitialTime(0).create();
  const send = vi.fn();

  scheduleReminder(timeProvider, send);
  timeProvider.clock.moveBy({ minutes: 4 });
  expect(send).not.toHaveBeenCalled();

  timeProvider.clock.moveBy({ minutes: 1 });
  expect(send).toHaveBeenCalledOnce();
});
```

[Testing With Time-Provider](/guide/testing) covers the other clock
strategies. Coming from `jest.useFakeTimers()` or `sinon.useFakeTimers()`? See
[Compared to Jest](/guide/vs-jest) and [Compared to Sinon](/guide/vs-sinon).
