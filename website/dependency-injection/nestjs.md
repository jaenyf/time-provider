# With NestJS

This example registers the Time-Provider as a singleton with NestJS, through a
factory provider.

You may want to dispose the Time-Provider when the container shuts down, so
its pending timers do not run once shutdown has started. Nest does not call
`dispose()` on a factory's value, so the module does it in `onModuleDestroy()`,
which runs on `app.close()`.

```ts
import { Inject, Injectable, Module, type OnModuleDestroy } from "@nestjs/common";
import { createTimeProvider, type IUtcOnlyTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

export const TIME_PROVIDER = Symbol("TimeProvider");

@Injectable()
export class ReminderService {
  constructor(@Inject(TIME_PROVIDER) private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}
  // ...
}

@Module({
  providers: [
    { provide: TIME_PROVIDER, useFactory: () => createTimeProvider.for(plugin).create() },
    ReminderService,
  ],
})
export class AppModule implements OnModuleDestroy {
  constructor(@Inject(TIME_PROVIDER) private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}

  onModuleDestroy() {
    this.timeProvider.dispose();
  }
}
```
