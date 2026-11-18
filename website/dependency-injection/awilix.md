# With Awilix

This example registers the Time-Provider as a singleton with Awilix, through
`singleton()`. Awilix resolves by name, so no token is needed.

You may want to dispose the Time-Provider when the container shuts down, so
its pending timers do not run once shutdown has started. `disposer()` does it
when `container.dispose()` runs.

```ts
import { asClass, asFunction, createContainer } from "awilix";
import { createTimeProvider, type IUtcOnlyTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

export class ReminderService {
  private readonly timeProvider: IUtcOnlyTimeProvider<Date>;

  constructor({ timeProvider }: { timeProvider: IUtcOnlyTimeProvider<Date> }) {
    this.timeProvider = timeProvider;
  }
  // ...
}

export const container = createContainer({ strict: true }).register({
  timeProvider: asFunction(() => createTimeProvider.for(plugin).create())
    .singleton()
    .disposer((timeProvider) => timeProvider.dispose()),
  reminders: asClass(ReminderService),
});
```

A unit test passes the manual clock the same way:
`new ReminderService({ timeProvider })`.
