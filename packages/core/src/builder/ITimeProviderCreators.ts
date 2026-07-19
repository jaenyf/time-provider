import type {
  IManualTimeProvider,
  IUtcOnlyManualTimeProvider,
} from "../api/IManualTimeProvider.ts";
import type { IPlugin } from "../api/IPlugin.ts";
import type { IUtcOnlyPlugin } from "../api/IUtcOnlyPlugin.ts";
import type { ITimeProvider, IUtcOnlyTimeProvider } from "../api/ITimeProvider.ts";

interface ICreateTimeProvider<TDate> {
  create(): ITimeProvider<TDate>;
}

interface ICreateUtcOnlyTimeProvider<TDate> {
  create(): IUtcOnlyTimeProvider<TDate>;
}

export interface IFixedTimeProviderCreator<TDate> extends ICreateTimeProvider<TDate> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(initialDateTime: string | number | TDate): IFixedTimeProviderCreator<TDate>;
}

export interface IUtcOnlyFixedTimeProviderCreator<TDate> extends ICreateUtcOnlyTimeProvider<TDate> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(initialDateTime: string | number | TDate): IUtcOnlyFixedTimeProviderCreator<TDate>;
}

export interface IManualTimeProviderCreator<TDate> extends ICreateTimeProvider<TDate> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(initialDateTime: string | number | TDate): IManualTimeProviderCreator<TDate>;
  /**
   * Create a manual Time-Provider.
   */
  create(): IManualTimeProvider<TDate>;
}

export interface IUtcOnlyManualTimeProviderCreator<
  TDate,
> extends ICreateUtcOnlyTimeProvider<TDate> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(
    initialDateTime: string | number | TDate,
  ): IUtcOnlyManualTimeProviderCreator<TDate>;
  /**
   * Create a manual Time-Provider.
   */
  create(): IUtcOnlyManualTimeProvider<TDate>;
}

export interface ISequentialTimeProviderCreator<TDate> extends ICreateTimeProvider<TDate> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialTimeProviderCreator<TDate>;
}

export interface IUtcOnlySequentialTimeProviderCreator<
  TDate,
> extends ICreateUtcOnlyTimeProvider<TDate> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): IUtcOnlySequentialTimeProviderCreator<TDate>;
}

export interface IPluggedTimeProviderCreator<TDate> {
  /**
   * Create a Time-Provider for the system time.
   */
  create(): ITimeProvider<TDate>;
  /**
   * Start the setup of a manual Time-Provider.
   */
  asManual(): IManualTimeProviderCreator<TDate>;
  /**
   * Start the setup of a fixed Time-Provider.
   */
  asFixed(): IFixedTimeProviderCreator<TDate>;
  /**
   * Start the setup of a sequential Time-Provider.
   */
  asSequential(): ISequentialTimeProviderCreator<TDate>;
}

export interface IUtcOnlyPluggedTimeProviderCreator<TDate> {
  /**
   * Create a Time-Provider for the system time.
   */
  create(): IUtcOnlyTimeProvider<TDate>;
  /**
   * Start the setup of a manual Time-Provider.
   */
  asManual(): IUtcOnlyManualTimeProviderCreator<TDate>;
  /**
   * Start the setup of a fixed Time-Provider.
   */
  asFixed(): IUtcOnlyFixedTimeProviderCreator<TDate>;
  /**
   * Start the setup of a sequential Time-Provider.
   */
  asSequential(): IUtcOnlySequentialTimeProviderCreator<TDate>;
}

export interface ITimeProviderCreator {
  /**
   * Setup a Time-Provider for a given plugin (adapter)
   *
   * Overload order matters: `IUtcOnlyPlugin` must be checked first. Both interfaces are
   * discriminated by `supportsLocalTime` (`false` vs `true`), so a full `IPlugin` never
   * accidentally matches the narrower overload.
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: IUtcOnlyPlugin<TDate>): IUtcOnlyPluggedTimeProviderCreator<TDate>;
  for<TDate>(adapter: IPlugin<TDate>): IPluggedTimeProviderCreator<TDate>;
}
