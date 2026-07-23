import type {
  IManualTimeProvider,
  IUtcOnlyManualTimeProvider,
} from "../api/IManualTimeProvider.ts";
import type { ISystemPlugin } from "../api/ISystemPlugin.ts";
import type { IUtcOnlySystemPlugin } from "../api/IUtcOnlySystemPlugin.ts";
import type { IDeterministicPlugin } from "../api/IDeterministicPlugin.ts";
import type { IUtcOnlyDeterministicPlugin } from "../api/IUtcOnlyDeterministicPlugin.ts";
import type { ITimeProvider, IUtcOnlyTimeProvider } from "../api/ITimeProvider.ts";
import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";

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

export interface IFixedTimeProviderCreator<TDate>
  extends
    ICreateTimeProvider<ITimeProvider<TDate>>,
    IComposeWithTimezone<IFixedTimeProviderCreator<TDate>> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(initialDateTime: string | number | TDate): IFixedTimeProviderCreator<TDate>;
}

export interface IUtcOnlyFixedTimeProviderCreator<TDate> extends ICreateTimeProvider<
  IUtcOnlyTimeProvider<TDate>
> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(initialDateTime: string | number | TDate): IUtcOnlyFixedTimeProviderCreator<TDate>;
}

export interface IManualTimeProviderCreator<TDate>
  extends
    ICreateTimeProvider<IManualTimeProvider<TDate>>,
    IComposeWithTimezone<IManualTimeProviderCreator<TDate>> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(initialDateTime: string | number | TDate): IManualTimeProviderCreator<TDate>;
}

export interface IUtcOnlyManualTimeProviderCreator<TDate> extends ICreateTimeProvider<
  IUtcOnlyManualTimeProvider<TDate>
> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(
    initialDateTime: string | number | TDate,
  ): IUtcOnlyManualTimeProviderCreator<TDate>;
}

export interface ISequentialTimeProviderCreator<TDate>
  extends
    ICreateTimeProvider<ITimeProvider<TDate>>,
    IComposeWithTimezone<ISequentialTimeProviderCreator<TDate>> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialTimeProviderCreator<TDate>;
}

export interface IUtcOnlySequentialTimeProviderCreator<TDate> extends ICreateTimeProvider<
  IUtcOnlyTimeProvider<TDate>
> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): IUtcOnlySequentialTimeProviderCreator<TDate>;
}

/**
 * The plugged creator returned by `createTimeProvider.for()` - the
 * production entry point. Deliberately exposes only `create()`: adding
 * `asManual()`/`asFixed()`/`asSequential()` here, even unused, would keep a
 * static reference from this type's implementation to the deterministic
 * runtime classes, defeating tree-shaking for consumers who never call them.
 * Use `createDeterministicTimeProvider.for()` for those.
 */
export interface ISystemPluggedTimeProviderCreator<TDate>
  extends
    ICreateTimeProvider<ITimeProvider<TDate>>,
    IComposeWithTimezone<ISystemPluggedTimeProviderCreator<TDate>> {}

export interface IUtcOnlySystemPluggedTimeProviderCreator<TDate> extends ICreateTimeProvider<
  IUtcOnlyTimeProvider<TDate>
> {}

/**
 * The plugged creator returned by `createDeterministicTimeProvider.for()` -
 * the fixed/manual/sequential (test) entry point.
 */
export interface IDeterministicPluggedTimeProviderCreator<TDate>
  extends
    IComposeWithTimezone<IDeterministicPluggedTimeProviderCreator<TDate>>,
    IAsRuntimeCreators<
      IFixedTimeProviderCreator<TDate>,
      IManualTimeProviderCreator<TDate>,
      ISequentialTimeProviderCreator<TDate>
    > {}

export interface IUtcOnlyDeterministicPluggedTimeProviderCreator<TDate> extends IAsRuntimeCreators<
  IUtcOnlyFixedTimeProviderCreator<TDate>,
  IUtcOnlyManualTimeProviderCreator<TDate>,
  IUtcOnlySequentialTimeProviderCreator<TDate>
> {}

/**
 * Factory to create a system-only runtime builder - the production entry
 * point. See ARCHITECTURE.md's tree-shaking notes for why this is separate
 * from `IDeterministicTimeProviderCreator`.
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
 * Factory to create a fixed/manual/sequential (deterministic) runtime
 * builder - the test entry point.
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
