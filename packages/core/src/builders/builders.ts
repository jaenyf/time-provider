import type {
  IDeterministicPlugin,
  IDisposable,
  IManualTimeProvider,
  IRuntime,
  ISystemPlugin,
  ITimeProvider,
  IUtcOnlyDeterministicPlugin,
  IUtcOnlyManualTimeProvider,
  IUtcOnlySystemPlugin,
  IUtcOnlyTimeProvider,
  TimezoneDefinition,
} from "../types/types.ts";

interface ICreateTimeProvider<TProvider> {
  /**
   * Builds the Time-Provider from the options accumulated so far.
   */
  create(): TProvider;
}

interface IComposeWithTimezone<TBuilder> {
  /**
   * Define the timezone used to produce local time.
   * @param timezone the local timezone as a `TimezoneDefinition`
   * @returns self
   */
  withTimezone(timezone: TimezoneDefinition): TBuilder;

  /**
   * Define the timezone used to produce local time to be the host timezone.
   * @returns self
   */
  withHostTimezone(): TBuilder;

  /**
   * Discard any custom local timezone set and restore the default one (UTC)
   * @returns self
   */
  withDefaultTimezone(): TBuilder;
}

export interface IAddon<TDate> extends IDisposable {
  get runtime(): IRuntime<TDate>;
  /**
   * Extends a system runtime.
   */
  applyToRuntime<TRuntime extends IRuntime<TDate>>(runtime: TRuntime): void;
}

/**
 * An addon that extends a system (real time) Time-Provider with extra, addon-specific
 * commodities (`TExtra`).
 */
export interface ISystemAddon<TDate> extends IAddon<TDate> {}

/**
 * An addon that extends a deterministic (manual/fixed/sequential) Time-Provider with extra,
 * addon-specific commodities (`TExtra`).
 */
export interface IDeterministicAddon<TDate> extends IAddon<TDate> {}

/**
 * What an addon package exports instead of the addon itself: something that produces a fresh
 * `TAddon` on demand. `.use()` calls {@link create} once, at Time-Provider creation time - not
 * when composed - so an addon-builder can accumulate configuration (e.g. the animation-frame
 * addon's `withHostFramesRate`) between `.use()` and `.create()`.
 *
 * Deliberately not generic over `TDate` itself: `TAddon` already carries it (via `IAddon<TDate>`),
 * and a `TDate` parameter unused by any member here would be structurally invariant, defeating
 * `.use()`'s ability to match an addon-builder against the runtime-builder's own `TDate`.
 */
// biome-ignore lint/suspicious/noExplicitAny: the bound must accept IAddon<TDate> for every TDate,
// including an unresolved generic one (e.g. inside an addon package's own `addon<TDate>()`
// factory) - `unknown` rejects those, only `any` is permissive enough here.
export interface IAddonBuilder<TAddon extends IAddon<any> = IAddon<any>> {
  /**
   * Builds the addon from the configuration accumulated so far.
   */
  create(): TAddon;
}

/**
 * The shape an addon-builder factory must have for `.use()` to correctly resolve the addon it
 * produces for the runtime-builder's own `TDate`, rather than the factory's `TDate` collapsing to
 * `unknown`.
 *
 * `typeHint` is never read - it exists purely so TypeScript can infer a passed-in, still-generic
 * `<TDate>(typeHint?: TDate) => IAddonBuilder<SomeAddon<TDate>>` factory's `TDate` from this
 * parameter, the same way it infers `T` for `identity<T>(x: T): T` from a call's argument.
 * Reading `TDate` back out of the *return* type instead - as `.use()` would have to without this
 * parameter, since a factory passed by reference (not called) is otherwise plugged into a
 * concrete, non-generic target type - is a different, unsupported kind of inference: TypeScript
 * collapses `TDate` to `unknown` rather than performing it. Every addon package's own `addon()`
 * factory declares this same parameter to opt into the parameter-position inference instead.
 */
export type AddonBuilderFactory<TDate, TAddon extends IAddon<TDate>> = (
  typeHint?: TDate,
) => IAddonBuilder<TAddon>;

/**
 * Start the setup of a manual/fixed/sequential Time-Provider, on top of whatever `TFixed`/
 * `TManual`/`TSequential` builder kind the plugged builder produces.
 */
interface IAsRuntimeBuilders<TFixed, TManual, TSequential> {
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

/**
 * Builds a deterministic Time-Provider whose clock stays fixed at a single point in time.
 */
export interface IFixedRuntimeBuilder<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<ITimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<IFixedRuntimeBuilder<TDate, TExtra>> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(initialDateTime: string | number | TDate): IFixedRuntimeBuilder<TDate, TExtra>;
}

/**
 * Builds a deterministic, UTC only Time-Provider whose clock stays fixed at a single point in time.
 */
interface IUtcOnlyFixedRuntimeBuilder<TDate, TExtra = unknown> extends ICreateTimeProvider<
  IUtcOnlyTimeProvider<TDate> & TExtra
> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(
    initialDateTime: string | number | TDate,
  ): IUtcOnlyFixedRuntimeBuilder<TDate, TExtra>;
}

/**
 * Builds a deterministic Time-Provider whose clock can be moved forward or backward on demand
 * via {@link IAdvanceable.advance}.
 */
export interface IManualRuntimeBuilder<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<IManualTimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<IManualRuntimeBuilder<TDate, TExtra>> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(initialDateTime: string | number | TDate): IManualRuntimeBuilder<TDate, TExtra>;
}

/**
 * Builds a deterministic, UTC only Time-Provider whose clock can be moved forward or backward
 * on demand via {@link IAdvanceable.advance}.
 */
interface IUtcOnlyManualRuntimeBuilder<TDate, TExtra = unknown> extends ICreateTimeProvider<
  IUtcOnlyManualTimeProvider<TDate> & TExtra
> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(
    initialDateTime: string | number | TDate,
  ): IUtcOnlyManualRuntimeBuilder<TDate, TExtra>;
}

/**
 * Builds a deterministic Time-Provider that steps through a fixed sequence of times, one per
 * clock read.
 */
export interface ISequentialRuntimeBuilder<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<ITimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<ISequentialRuntimeBuilder<TDate, TExtra>> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialRuntimeBuilder<TDate, TExtra>;
}

/**
 * Builds a deterministic, UTC only Time-Provider that steps through a fixed sequence of times,
 * one per clock read.
 */
interface IUtcOnlySequentialRuntimeBuilder<TDate, TExtra = unknown> extends ICreateTimeProvider<
  IUtcOnlyTimeProvider<TDate> & TExtra
> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): IUtcOnlySequentialRuntimeBuilder<TDate, TExtra>;
}

/**
 * Builds a system (real time) Time-Provider for a given plugin, optionally composed with addons.
 */
export interface ISystemPluggedRuntimeBuilder<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<ITimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<ISystemPluggedRuntimeBuilder<TDate, TExtra>> {
  /**
   * Extends a Time-Provider with an addon's extra commodities.
   * @param addonBuilderFactory the addon-builder factory to compose with.
   */
  use<TAddon extends ISystemAddon<TDate>>(
    addonBuilderFactory: AddonBuilderFactory<TDate, TAddon>,
  ): ISystemPluggedRuntimeBuilder<TDate, TExtra & TAddon>;
}

/**
 * Builds a system (real time), UTC only Time-Provider for a given plugin, optionally composed
 * with addons.
 */
export interface IUtcOnlySystemPluggedRuntimeBuilder<
  TDate,
  TExtra = unknown,
> extends ICreateTimeProvider<IUtcOnlyTimeProvider<TDate> & TExtra> {
  /**
   * Extends a Time-Provider with an addon's extra commodities.
   * @param addonBuilderFactory the addon-builder factory to compose with.
   */
  use<TAddon extends ISystemAddon<TDate>>(
    addonBuilderFactory: AddonBuilderFactory<TDate, TAddon>,
  ): IUtcOnlySystemPluggedRuntimeBuilder<TDate, TExtra & TAddon>;
}

/**
 * Entry point for building a deterministic Time-Provider for a given plugin: pick a strategy
 * with {@link IAsRuntimeBuilders.asFixed}, {@link IAsRuntimeBuilders.asManual}, or
 * {@link IAsRuntimeBuilders.asSequential}, optionally composing addons first with {@link use}.
 */
export interface IDeterministicPluggedRuntimeBuilder<TDate, TExtra = unknown>
  extends
    IComposeWithTimezone<IDeterministicPluggedRuntimeBuilder<TDate, TExtra>>,
    IAsRuntimeBuilders<
      IFixedRuntimeBuilder<TDate, TExtra>,
      IManualRuntimeBuilder<TDate, TExtra>,
      ISequentialRuntimeBuilder<TDate, TExtra>
    > {
  /**
   * Extends a Time-Provider with an addon's extra commodities.
   * @param addonBuilderFactory the addon-builder factory to compose with.
   */
  use<TAddon extends IDeterministicAddon<TDate>>(
    addonBuilderFactory: AddonBuilderFactory<TDate, TAddon>,
  ): IDeterministicPluggedRuntimeBuilder<TDate, TExtra & TAddon>;
}

/**
 * Entry point for building a deterministic, UTC only Time-Provider for a given plugin: pick a
 * strategy with {@link IAsRuntimeBuilders.asFixed}, {@link IAsRuntimeBuilders.asManual}, or
 * {@link IAsRuntimeBuilders.asSequential}, optionally composing addons first with {@link use}.
 */
export interface IUtcOnlyDeterministicPluggedRuntimeBuilder<
  TDate,
  TExtra = unknown,
> extends IAsRuntimeBuilders<
  IUtcOnlyFixedRuntimeBuilder<TDate, TExtra>,
  IUtcOnlyManualRuntimeBuilder<TDate, TExtra>,
  IUtcOnlySequentialRuntimeBuilder<TDate, TExtra>
> {
  /**
   * Extends a Time-Provider with an addon's extra commodities.
   * @param addonBuilderFactory the addon-builder factory to compose with.
   */
  use<TAddon extends IDeterministicAddon<TDate>>(
    addonBuilderFactory: AddonBuilderFactory<TDate, TAddon>,
  ): IUtcOnlyDeterministicPluggedRuntimeBuilder<TDate, TExtra & TAddon>;
}

/**
 * Factory to create a system (real time) runtime builder.
 */
export interface IRuntimeBuilder {
  /**
   * Setup a Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: IUtcOnlySystemPlugin<TDate>): IUtcOnlySystemPluggedRuntimeBuilder<TDate>;
  /**
   * Setup a Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: ISystemPlugin<TDate>): ISystemPluggedRuntimeBuilder<TDate>;
}

/**
 * Factory to create a deterministic runtime builder.
 */
export interface IDeterministicRuntimeBuilder {
  /**
   * Setup a deterministic Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(
    adapter: IUtcOnlyDeterministicPlugin<TDate>,
  ): IUtcOnlyDeterministicPluggedRuntimeBuilder<TDate>;
  /**
   * Setup a deterministic Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for<TDate>(adapter: IDeterministicPlugin<TDate>): IDeterministicPluggedRuntimeBuilder<TDate>;
}
