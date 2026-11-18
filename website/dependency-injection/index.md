# Dependency Injection

A Time-Provider is a plain object built for dependency injection: it handles every time-related operation, any container can hold it, and the code it serves becomes testable by injecting a deterministic clock.

- Register a Time-Provider, for example as a singleton, so every service shares the same
  clock and timers.
- Eventually dispose of it when the container shuts down, which cancels any of its pending timers.
- In unit tests, pass a deterministic time-provider to the tested service.

As an example to illustrate DI with Time-Provider, let's consider this service:

```ts
class ReminderService {
  constructor(private readonly timeProvider: IUtcOnlyTimeProvider<Date>) {}

  schedule(send: () => void) {
    this.timeProvider.scheduler.timers.once({ minutes: 5 }, send);
  }
}
```

_Note: `IUtcOnlyTimeProvider<Date>` and `ITimeProvider<Date>` are interfaces, which
do not exist at runtime, so containers that resolve by type need a token for
them._

## Unit tests

Services making use of Time-Provider can then be tested directly
with a deterministic clock, whichever container the app uses:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin as nativeDateAdapter } from "@time-provider/plugin-native/deterministic";

it("sends the reminder after five minutes", () => {
  using timeProvider = createTimeProvider.for(nativeDateAdapter).asManual().create();
  const reminders = new ReminderService(timeProvider);
  const send = vi.fn();

  reminders.schedule(send);
  timeProvider.clock.moveBy({ minutes: 5 });

  expect(send).toHaveBeenCalledOnce();
});
```

## Containers

For reference, don't hesitate to check out the following examples, which show how to configure Time-Provider with your DI container:

- [With NestJS](/dependency-injection/nestjs)
- [With Angular](/dependency-injection/angular)
- [With InversifyJS](/dependency-injection/inversify)
- [With tsyringe](/dependency-injection/tsyringe)
- [With TypeDI](/dependency-injection/typedi)
- [With Awilix](/dependency-injection/awilix)
- [With typed-inject](/dependency-injection/typed-inject)
