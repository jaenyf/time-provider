# With InversifyJS

This example registers the Time-Provider as a singleton with InversifyJS,
through a binding in singleton scope.

You may want to dispose the Time-Provider when the container shuts down, so
its pending timers do not run once shutdown has started. `onDeactivation()`
does it when `container.unbindAll()` runs.

```ts
import { Container, inject, injectable } from "inversify";
import { createTimeProvider, type IUtcOnlyTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

export const TIME_PROVIDER = Symbol("TimeProvider");

@injectable()
export class ReminderService {
  constructor(@inject(TIME_PROVIDER) private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}
  // ...
}

export const container = new Container();
container
  .bind<IUtcOnlyTimeProvider<Date>>(TIME_PROVIDER)
  .toDynamicValue(() => createTimeProvider.for(plugin).create())
  .inSingletonScope()
  .onDeactivation((timeProvider) => timeProvider.dispose());
container.bind(ReminderService).toSelf();
```
