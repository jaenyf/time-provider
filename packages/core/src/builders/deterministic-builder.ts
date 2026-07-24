import type {
  IDeterministicPlugin,
  IManualTimeProvider,
  ITimeProvider,
  IUtcOnlyDeterministicPlugin,
  TimezoneDefinition,
} from "../types/types.ts";
import type {
  IDeterministicPluggedTimeProviderCreator,
  IDeterministicTimeProviderCreator,
  IFixedTimeProviderCreator,
  IManualTimeProviderCreator,
  ISequentialTimeProviderCreator,
  IUtcOnlyDeterministicPluggedTimeProviderCreator,
} from "./builders.ts";
import { BaseTimeProviderCreator } from "./builder-base.ts";

type AnyDeterministicPlugin<TDate> =
  | IDeterministicPlugin<TDate>
  | IUtcOnlyDeterministicPlugin<TDate>;

class FixedTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<AnyDeterministicPlugin<TDate>>
  implements IFixedTimeProviderCreator<TDate>
{
  #fixedDateTime?: string | number | TDate;

  constructor(plugin: AnyDeterministicPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
    this.#fixedDateTime = undefined;
  }
  withFixedTime(initialDateTime: string | number | TDate): IFixedTimeProviderCreator<TDate> {
    this.#fixedDateTime = initialDateTime;
    return this;
  }
  create(): ITimeProvider<TDate> {
    const initialTime = undefined !== this.#fixedDateTime ? this.#fixedDateTime : 0;
    return Object.freeze(
      this.plugin.supportsLocalTime
        ? this.plugin.createFixedRuntime(this.localTimezone, initialTime)
        : (this.plugin.createFixedRuntime(initialTime) as unknown as ITimeProvider<TDate>),
    );
  }
}

class ManualTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<AnyDeterministicPlugin<TDate>>
  implements IManualTimeProviderCreator<TDate>
{
  #initialDateTime?: string | number | TDate;

  constructor(plugin: AnyDeterministicPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
    this.#initialDateTime = undefined;
  }

  withInitialTime(initialDateTime: string | number | TDate): IManualTimeProviderCreator<TDate> {
    this.#initialDateTime = initialDateTime;
    return this;
  }
  create(): IManualTimeProvider<TDate> {
    const initialTime = undefined !== this.#initialDateTime ? this.#initialDateTime : 0;
    return Object.freeze(
      this.plugin.supportsLocalTime
        ? this.plugin.createManualRuntime(this.localTimezone, initialTime)
        : (this.plugin.createManualRuntime(initialTime) as unknown as IManualTimeProvider<TDate>),
    );
  }
}

class SequentialTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<AnyDeterministicPlugin<TDate>>
  implements ISequentialTimeProviderCreator<TDate>
{
  #sequentialTimes: (string | number | TDate)[] = [];

  constructor(plugin: AnyDeterministicPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
  }

  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialTimeProviderCreator<TDate> {
    this.#sequentialTimes.push(sequentialDateTime);
    return this;
  }

  create(): ITimeProvider<TDate> {
    const sequentialTimes = this.#sequentialTimes.length ? this.#sequentialTimes : [0];
    return Object.freeze(
      this.plugin.supportsLocalTime
        ? this.plugin.createSequentialRuntime(this.localTimezone, sequentialTimes)
        : (this.plugin.createSequentialRuntime(sequentialTimes) as unknown as ITimeProvider<TDate>),
    );
  }
}

class DeterministicPluggedTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<AnyDeterministicPlugin<TDate>>
  implements IDeterministicPluggedTimeProviderCreator<TDate>
{
  constructor(plugin: AnyDeterministicPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
  }

  asManual(): IManualTimeProviderCreator<TDate> {
    return Object.freeze(new ManualTimeProviderCreator(this.plugin, this.localTimezone));
  }
  asFixed(): IFixedTimeProviderCreator<TDate> {
    return Object.freeze(new FixedTimeProviderCreator(this.plugin, this.localTimezone));
  }
  asSequential(): ISequentialTimeProviderCreator<TDate> {
    return Object.freeze(new SequentialTimeProviderCreator(this.plugin, this.localTimezone));
  }
}

class DeterministicTimeProviderCreator implements IDeterministicTimeProviderCreator {
  /*
    The underlying runtime objects always have the full capability regardless of which overload matched.
    Only the declared type at this boundary is restricted for IUtcOnlyDeterministicPlugin adapters, so this widening is safe.
  */
  for<TDate>(
    adapter: IUtcOnlyDeterministicPlugin<TDate>,
  ): IUtcOnlyDeterministicPluggedTimeProviderCreator<TDate>;
  for<TDate>(adapter: IDeterministicPlugin<TDate>): IDeterministicPluggedTimeProviderCreator<TDate>;
  for<TDate>(
    adapter: AnyDeterministicPlugin<TDate>,
  ):
    | IDeterministicPluggedTimeProviderCreator<TDate>
    | IUtcOnlyDeterministicPluggedTimeProviderCreator<TDate> {
    return new DeterministicPluggedTimeProviderCreator(adapter, "Etc/UTC");
  }
}

export const createDeterministicTimeProvider: IDeterministicTimeProviderCreator =
  new DeterministicTimeProviderCreator();
