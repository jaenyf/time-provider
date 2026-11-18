# With typed-inject

This example registers the Time-Provider as a singleton with typed-inject,
through `provideFactory()`, which caches its value by default. typed-inject
checks the injected names and types at compile time.

You may want to dispose the Time-Provider when the container shuts down, so
its pending timers do not run once shutdown has started. `injector.dispose()`
does it, since it disposes every value the injector provided.

```ts
import { createInjector } from "typed-inject";
import { createTimeProvider, type IUtcOnlyTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

export class ReminderService {
  static inject = ["timeProvider"] as const;

  constructor(private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}
  // ...
}

export const injector = createInjector().provideFactory("timeProvider", () =>
  createTimeProvider.for(plugin).create(),
);
export const reminders = injector.injectClass(ReminderService);
```
