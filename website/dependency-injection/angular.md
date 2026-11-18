# With Angular

This example registers the Time-Provider as a singleton with Angular, through an
injection token provided in `"root"`. The service takes it through its
constructor rather than an `inject()` field, so a unit test can build it with
`new`.

You may want to dispose the Time-Provider when the container shuts down, so
its pending timers do not run once shutdown has started. The token's factory
does it through `DestroyRef` when the root injector is destroyed.

```ts
import { DestroyRef, Inject, Injectable, InjectionToken, inject } from "@angular/core";
import { createTimeProvider, type IUtcOnlyTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

export const TIME_PROVIDER = new InjectionToken<IUtcOnlyTimeProvider<Date>>("TimeProvider", {
  providedIn: "root",
  factory: () => {
    const timeProvider = createTimeProvider.for(plugin).create();
    inject(DestroyRef).onDestroy(() => timeProvider.dispose());
    return timeProvider;
  },
});

@Injectable({ providedIn: "root" })
export class ReminderService {
  constructor(@Inject(TIME_PROVIDER) private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}
  // ...
}
```
