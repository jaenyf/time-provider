import type { IManualTimeProvider } from "../api/IManualTimeProvider.ts";
import type { IPlugin } from "../api/IPlugin.ts";
import type { IUtcOnlyPlugin } from "../api/IUtcOnlyPlugin.ts";
import type { ITimeProvider } from "../api/ITimeProvider.ts";
import type {
  IFixedTimeProviderCreator,
  IManualTimeProviderCreator,
  IPluggedTimeProviderCreator,
  ISequentialTimeProviderCreator,
  ITimeProviderCreator,
  IUtcOnlyPluggedTimeProviderCreator,
} from "./ITimeProviderCreators.ts";
import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";

abstract class BaseTimeProviderCreator<TDate> {
  #plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>;
  #localTimezone: TimezoneDefinition;

  static defaultTimezone: TimezoneDefinition = "Etc/UTC";

  constructor(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>, localTimezone: TimezoneDefinition) {
    this.#plugin = plugin;
    this.#localTimezone = localTimezone;
  }

  protected get plugin() {
    return this.#plugin;
  }

  protected get localTimezone() {
    return this.#localTimezone;
  }

  protected set localTimezone(value: TimezoneDefinition) {
    this.#localTimezone = value;
  }

  withLocalTimezone(timezone: TimezoneDefinition): this {
    this.localTimezone = timezone;
    return this;
  }

  withDefaultLocalTimezone(): this {
    this.localTimezone = BaseTimeProviderCreator.defaultTimezone;
    return this;
  }
}

class FixedTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<TDate>
  implements IFixedTimeProviderCreator<TDate>
{
  #fixedDateTime?: string | number | TDate;

  constructor(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
    this.#fixedDateTime = undefined;
  }
  withFixedTime(initialDateTime: string | number | TDate): IFixedTimeProviderCreator<TDate> {
    this.#fixedDateTime = initialDateTime;
    return this;
  }
  create(): ITimeProvider<TDate> {
    const initialTime = undefined !== this.#fixedDateTime ? this.#fixedDateTime : 0;
    return this.plugin.supportsLocalTime
      ? this.plugin.createFixedRuntime(this.localTimezone, initialTime)
      : (this.plugin.createFixedRuntime(initialTime) as unknown as ITimeProvider<TDate>);
  }
}

class ManualTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<TDate>
  implements IManualTimeProviderCreator<TDate>
{
  #initialDateTime?: string | number | TDate;

  constructor(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
    this.#initialDateTime = undefined;
  }

  withInitialTime(initialDateTime: string | number | TDate): IManualTimeProviderCreator<TDate> {
    this.#initialDateTime = initialDateTime;
    return this;
  }
  create(): IManualTimeProvider<TDate> {
    const initialTime = undefined !== this.#initialDateTime ? this.#initialDateTime : 0;
    return this.plugin.supportsLocalTime
      ? this.plugin.createManualRuntime(this.localTimezone, initialTime)
      : (this.plugin.createManualRuntime(initialTime) as unknown as IManualTimeProvider<TDate>);
  }
}

class SequentialTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<TDate>
  implements ISequentialTimeProviderCreator<TDate>
{
  #sequentialTimes: (string | number | TDate)[] = [];

  constructor(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>, localTimezone: TimezoneDefinition) {
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
    return this.plugin.supportsLocalTime
      ? this.plugin.createSequentialRuntime(this.localTimezone, sequentialTimes)
      : (this.plugin.createSequentialRuntime(sequentialTimes) as unknown as ITimeProvider<TDate>);
  }
}

export class TimeProviderCreator implements ITimeProviderCreator {
  /*
    The underlying runtime objects always have the full capability regardless of which overload matched.
    Only the declared type at this boundary is restricted for IUtcOnlyPlugin adapters, so this widening is safe.
  */
  for<TDate>(adapter: IUtcOnlyPlugin<TDate>): IUtcOnlyPluggedTimeProviderCreator<TDate>;
  for<TDate>(adapter: IPlugin<TDate>): IPluggedTimeProviderCreator<TDate>;
  for<TDate>(
    adapter: IPlugin<TDate> | IUtcOnlyPlugin<TDate>,
  ): IPluggedTimeProviderCreator<TDate> | IUtcOnlyPluggedTimeProviderCreator<TDate> {
    return new PluggedTimeProviderCreator(adapter, "Etc/UTC");
  }
}

export class PluggedTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<TDate>
  implements IPluggedTimeProviderCreator<TDate>
{
  constructor(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
  }

  create(): ITimeProvider<TDate> {
    return this.plugin.supportsLocalTime
      ? this.plugin.createSystemRuntime(this.localTimezone)
      : (this.plugin.createSystemRuntime() as unknown as ITimeProvider<TDate>);
  }
  asManual(): IManualTimeProviderCreator<TDate> {
    return new ManualTimeProviderCreator(this.plugin, this.localTimezone);
  }
  asFixed(): IFixedTimeProviderCreator<TDate> {
    return new FixedTimeProviderCreator(this.plugin, this.localTimezone);
  }
  asSequential(): ISequentialTimeProviderCreator<TDate> {
    return new SequentialTimeProviderCreator(this.plugin, this.localTimezone);
  }
}
