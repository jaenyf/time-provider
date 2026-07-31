import type {
  IDeterministicPlugin,
  IManualTimeProvider,
  ISystemPlugin,
  ITimeProvider,
  IUtcOnlyDeterministicPlugin,
  IUtcOnlyManualTimeProvider,
  IUtcOnlySystemPlugin,
  IUtcOnlyTimeProvider,
  TimezoneDefinition,
} from "../types/types.ts";

interface ICreateTimeProvider<TProvider> {
  create(): TProvider;
}

interface IComposeWithTimezone<TCreator> {
  /**
   * Define the timezone used to produce local time.
   * @param timezone the local timezone as a `TimezoneDefinition`
   * @returns self
   */
  withTimezone(timezone: TimezoneDefinition): TCreator;

  /**
   * Define the timezone used to produce local time to be the host timezone.
   * @returns self
   */
  withHostTimezone(): TCreator;

  /**
   * Discard any custom local timezone set and restore the default one (UTC)
   * @returns self
   */
  withDefaultTimezone(): TCreator;
}

export interface ISystemTimeProviderAddon<TDate, TExtra> {
  /**
   * Extends a system runtime.
   */
  applyToRuntime<TRuntime extends ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>>(
    runtime: TRuntime,
  ): TRuntime & TExtra;
  /**
   * Clone an addon instance in order to prevent shared/singleton setup leaking in other addon instances.
   */
  clone(): ISystemTimeProviderAddon<TDate, TExtra>;
}

export interface IDeterministicTimeProviderAddon<TDate, TExtra> {
  /**
   * Extends a deterministic runtime.
   */
  applyToRuntime<
    TRuntime extends
      | ITimeProvider<TDate>
      | IUtcOnlyTimeProvider<TDate>
      | IManualTimeProvider<TDate>
      | IUtcOnlyManualTimeProvider<TDate>,
  >(
    runtime: TRuntime,
  ): TRuntime & TExtra;
  /**
   * Clone an addon instance in order to prevent shared/singleton setup leaking in other addon instances.
   */
  clone(): IDeterministicTimeProviderAddon<TDate, TExtra>;
}

/**
 * Start the setup of a manual/fixed/sequential Time-Provider, on top of whatever `TFixed`/
 * `TManual`/`TSequential` creator kind the plugged creator produces.
 */
interface IAsRuntimeCreators<TFixed, TManual, TSequential> {
  /**
   * Start the setup of a manual Time-Provider.
   */
  asManual(): TManual;
  /**
   * Start the setup of a fixed Time-Provider.
   */
  asFixed(): TFixed;
  /**
   * Start the setup of a sequential Time-Provider.
   */
  asSequential(): TSequential;
}

export interface IFixedTimeProviderCreator<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<ITimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<IFixedTimeProviderCreator<TDate, TExtra>> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(initialDateTime: string | number | TDate): IFixedTimeProviderCreator<TDate, TExtra>;
}

interface IUtcOnlyFixedTimeProviderCreator<TDate, TExtra = unknown> extends ICreateTimeProvider<
  IUtcOnlyTimeProvider<TDate> & TExtra
> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(
    initialDateTime: string | number | TDate,
  ): IUtcOnlyFixedTimeProviderCreator<TDate, TExtra>;
}

export interface IManualTimeProviderCreator<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<IManualTimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<IManualTimeProviderCreator<TDate, TExtra>> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(
    initialDateTime: string | number | TDate,
  ): IManualTimeProviderCreator<TDate, TExtra>;
}

interface IUtcOnlyManualTimeProviderCreator<TDate, TExtra = unknown> extends ICreateTimeProvider<
  IUtcOnlyManualTimeProvider<TDate> & TExtra
> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(
    initialDateTime: string | number | TDate,
  ): IUtcOnlyManualTimeProviderCreator<TDate, TExtra>;
}

export interface ISequentialTimeProviderCreator<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<ITimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<ISequentialTimeProviderCreator<TDate, TExtra>> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialTimeProviderCreator<TDate, TExtra>;
}

interface IUtcOnlySequentialTimeProviderCreator<
  TDate,
  TExtra = unknown,
> extends ICreateTimeProvider<IUtcOnlyTimeProvider<TDate> & TExtra> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): IUtcOnlySequentialTimeProviderCreator<TDate, TExtra>;
}

export interface ISystemPluggedTimeProviderCreator<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<ITimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<ISystemPluggedTimeProviderCreator<TDate, TExtra>> {
  /**
   * Extends a Time-Provider with an addon's extra commodities.
   * @param addon the addon to compose with.
   */
  use<TAddonExtra, TBuilderExtra = unknown>(
    addon: ISystemTimeProviderAddon<TDate, TAddonExtra> & TBuilderExtra,
  ): ISystemPluggedTimeProviderCreator<TDate, TExtra & TAddonExtra> & TBuilderExtra;
}

export interface IUtcOnlySystemPluggedTimeProviderCreator<
  TDate,
  TExtra = unknown,
> extends ICreateTimeProvider<IUtcOnlyTimeProvider<TDate> & TExtra> {
  /**
   * Extends a Time-Provider with an addon's extra commodities.
   * @param addon the addon to compose with.
   */
  use<TAddonExtra, TBuilderExtra = unknown>(
    addon: ISystemTimeProviderAddon<TDate, TAddonExtra> & TBuilderExtra,
  ): IUtcOnlySystemPluggedTimeProviderCreator<TDate, TExtra & TAddonExtra> & TBuilderExtra;
}

export interface IDeterministicPluggedTimeProviderCreator<TDate, TExtra = unknown>
  extends
    IComposeWithTimezone<IDeterministicPluggedTimeProviderCreator<TDate, TExtra>>,
    IAsRuntimeCreators<
      IFixedTimeProviderCreator<TDate, TExtra>,
      IManualTimeProviderCreator<TDate, TExtra>,
      ISequentialTimeProviderCreator<TDate, TExtra>
    > {
  /**
   * Extends a Time-Provider with an addon's extra commodities.
   * @param addon the addon to compose with.
   */
  use<TAddonExtra, TBuilderExtra = unknown>(
    addon: IDeterministicTimeProviderAddon<TDate, TAddonExtra> & TBuilderExtra,
  ): IDeterministicPluggedTimeProviderCreator<TDate, TExtra & TAddonExtra> & TBuilderExtra;
}

export interface IUtcOnlyDeterministicPluggedTimeProviderCreator<
  TDate,
  TExtra = unknown,
> extends IAsRuntimeCreators<
  IUtcOnlyFixedTimeProviderCreator<TDate, TExtra>,
  IUtcOnlyManualTimeProviderCreator<TDate, TExtra>,
  IUtcOnlySequentialTimeProviderCreator<TDate, TExtra>
> {
  /**
   * Extends a Time-Provider with an addon's extra commodities.
   * @param addon the addon to compose with.
   */
  use<TAddonExtra, TBuilderExtra = unknown>(
    addon: IDeterministicTimeProviderAddon<TDate, TAddonExtra> & TBuilderExtra,
  ): IUtcOnlyDeterministicPluggedTimeProviderCreator<TDate, TExtra & TAddonExtra> & TBuilderExtra;
}

/**
 * Factory to create a system (real time) runtime builder.
 */
export interface ITimeProviderCreator {
  /**
   * Setup a Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: IUtcOnlySystemPlugin<TDate>): IUtcOnlySystemPluggedTimeProviderCreator<TDate>;
  /**
   * Setup a Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: ISystemPlugin<TDate>): ISystemPluggedTimeProviderCreator<TDate>;
}

/**
 * Factory to create a deterministic runtime builder.
 */
export interface IDeterministicTimeProviderCreator {
  /**
   * Setup a deterministic Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(
    adapter: IUtcOnlyDeterministicPlugin<TDate>,
  ): IUtcOnlyDeterministicPluggedTimeProviderCreator<TDate>;
  /**
   * Setup a deterministic Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: IDeterministicPlugin<TDate>): IDeterministicPluggedTimeProviderCreator<TDate>;
}
