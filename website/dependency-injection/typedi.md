# With TypeDI

This example registers the Time-Provider as a singleton with TypeDI, through a
factory whose value the container keeps.

You may want to dispose the Time-Provider when the container shuts down, so
its pending timers do not run once shutdown has started. TypeDI never calls
`dispose()`, so call it yourself:

```ts
import { Container, Inject, Service, Token } from "typedi";
import { createTimeProvider, type IUtcOnlyTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

export const TIME_PROVIDER = new Token<IUtcOnlyTimeProvider<Date>>("TimeProvider");

@Service()
export class ReminderService {
  constructor(@Inject(TIME_PROVIDER) private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}
  // ...
}

Container.set({ id: TIME_PROVIDER, factory: () => createTimeProvider.for(plugin).create() });

// on shutdown
Container.get(TIME_PROVIDER).dispose();
```
