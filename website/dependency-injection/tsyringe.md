# With tsyringe

This example registers the Time-Provider as a singleton with tsyringe, through
`instanceCachingFactory()`.

You may want to dispose the Time-Provider when the container shuts down, so
its pending timers do not run once shutdown has started. `container.dispose()`
only disposes instances that tsyringe constructed itself, not a factory's
value, so call `dispose()` yourself:

```ts
import { container, inject, injectable, instanceCachingFactory } from "tsyringe";
import { createTimeProvider, type IUtcOnlyTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

export const TIME_PROVIDER = Symbol("TimeProvider");

@injectable()
export class ReminderService {
  constructor(@inject(TIME_PROVIDER) private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}
  // ...
}

container.register(TIME_PROVIDER, {
  useFactory: instanceCachingFactory(() => createTimeProvider.for(plugin).create()),
});

// on shutdown
container.resolve<IUtcOnlyTimeProvider<Date>>(TIME_PROVIDER).dispose();
```
