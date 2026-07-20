import type {
  IManualTimeProvider,
  IUtcOnlyManualTimeProvider,
} from "../api/IManualTimeProvider.ts";
import type { IPlugin } from "../api/IPlugin.ts";
import type { IUtcOnlyPlugin } from "../api/IUtcOnlyPlugin.ts";
import type { ITimeProvider, IUtcOnlyTimeProvider } from "../api/ITimeProvider.ts";
import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";

interface ICreateTimeProvider<TProvider> {
  create(): TProvider;
}

interface IComposeWithLocalTimezone<TCreator> {
  /**
   * Define the timezone used to produce local time.
   * @param timezone the local timezone
   */
  withLocalTimezone(timezone: TimezoneDefinition): TCreator;

  /**
   * Discard any custom local timezone set and restore the default one.
   */
  withDefaultLocalTimezone(): TCreator;
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
    IComposeWithLocalTimezone<IFixedTimeProviderCreator<TDate>> {
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
    IComposeWithLocalTimezone<IManualTimeProviderCreator<TDate>> {
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
    IComposeWithLocalTimezone<ISequentialTimeProviderCreator<TDate>> {
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

export interface IPluggedTimeProviderCreator<TDate>
  extends
    ICreateTimeProvider<ITimeProvider<TDate>>,
    IComposeWithLocalTimezone<IPluggedTimeProviderCreator<TDate>>,
    IAsRuntimeCreators<
      IFixedTimeProviderCreator<TDate>,
      IManualTimeProviderCreator<TDate>,
      ISequentialTimeProviderCreator<TDate>
    > {}

export interface IUtcOnlyPluggedTimeProviderCreator<TDate>
  extends
    ICreateTimeProvider<IUtcOnlyTimeProvider<TDate>>,
    IAsRuntimeCreators<
      IUtcOnlyFixedTimeProviderCreator<TDate>,
      IUtcOnlyManualTimeProviderCreator<TDate>,
      IUtcOnlySequentialTimeProviderCreator<TDate>
    > {}

/**
 * Factory to create a runtime builder.
 */
export interface ITimeProviderCreator {
  /**
   * Setup a Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: IUtcOnlyPlugin<TDate>): IUtcOnlyPluggedTimeProviderCreator<TDate>;
  /**
   * Setup a Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: IPlugin<TDate>): IPluggedTimeProviderCreator<TDate>;
}
