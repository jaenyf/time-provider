import type { IPlugin } from "./IPlugin.ts";
import type { ITimeProvider } from "./ITimeProvider.ts";
import type {
  ICreateTimeProvider,
  IFixedTimeProviderCreator,
  IManualTimeProviderCreator,
  IPluggedTimeProviderCreator,
  ISequentialTimeProviderCreator,
  ITimeProviderCreator,
} from "./ITimeProviderCreators.ts";

abstract class BaseTimeProviderCreator<TDate> {
  #plugin: IPlugin<TDate>;

  constructor(plugin: IPlugin<TDate>) {
    this.#plugin = plugin;
  }

  protected get plugin() {
    return this.#plugin;
  }
}

export class FixedTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<TDate>
  implements IFixedTimeProviderCreator<TDate>
{
  #fixedDateTime?: string | number | TDate;

  constructor(plugin: IPlugin<TDate>) {
    super(plugin);
    this.#fixedDateTime = undefined;
  }

  withFixedTime(initialDateTime: string | number | TDate): ICreateTimeProvider<TDate> {
    this.#fixedDateTime = initialDateTime;
    return this;
  }
  create(): ITimeProvider<TDate> {
    return this.plugin.createFixedTimeAdapter(
      undefined !== this.#fixedDateTime ? this.#fixedDateTime : 0,
    );
  }
}

export class ManualTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<TDate>
  implements IManualTimeProviderCreator<TDate>
{
  constructor(plugin: IPlugin<TDate>) {
    super(plugin);
    this.#initialDateTime = undefined;
  }

  withInitialTime(initialDateTime: string | number | TDate): ICreateTimeProvider<TDate> {
    this.#initialDateTime = initialDateTime;
    return this;
  }
  #initialDateTime?: string | number | TDate;
  create(): ITimeProvider<TDate> {
    return this.plugin.createManualTimeAdapter(
      undefined !== this.#initialDateTime ? this.#initialDateTime : 0,
    );
  }
}

export class SequentialTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<TDate>
  implements ISequentialTimeProviderCreator<TDate>
{
  #sequentialTimes: (string | number | TDate)[] = [];

  constructor(plugin: IPlugin<TDate>) {
    super(plugin);
  }

  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialTimeProviderCreator<TDate> {
    this.#sequentialTimes.push(sequentialDateTime);
    return this;
  }

  create(): ITimeProvider<TDate> {
    return this.plugin.createSequentialTimeAdapter(this.#sequentialTimes);
  }
}

export class TimeProviderCreator implements ITimeProviderCreator {
  for<TDate>(adapter: IPlugin<TDate>): PluggedTimeProviderCreator<TDate> {
    return new PluggedTimeProviderCreator(adapter);
  }
}

export class PluggedTimeProviderCreator<TDate> implements IPluggedTimeProviderCreator<TDate> {
  #plugin: IPlugin<TDate>;
  constructor(plugin: IPlugin<TDate>) {
    this.#plugin = plugin;
  }

  create(): ITimeProvider<TDate> {
    return this.#plugin.createTimeAdapter();
  }
  asManual(): IManualTimeProviderCreator<TDate> {
    return new ManualTimeProviderCreator(this.#plugin);
  }
  asFixed(): IFixedTimeProviderCreator<TDate> {
    return new FixedTimeProviderCreator(this.#plugin);
  }
  asSequential(): ISequentialTimeProviderCreator<TDate> {
    return new SequentialTimeProviderCreator(this.#plugin);
  }
}
