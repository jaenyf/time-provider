import type {
  IDeterministicPlugin,
  IDisposable,
  IDeterministicTimeProvider,
  IManualTimeProvider,
  IRuntime,
  ISystemPlugin,
  ITimeProvider,
  IUtcOnlyDeterministicPlugin,
  IUtcOnlyDeterministicTimeProvider,
  IUtcOnlyManualTimeProvider,
  IUtcOnlySystemPlugin,
  IUtcOnlyTimeProvider,
  TimezoneDefinition,
  IDeterministicRuntime,
} from "../types/types.ts";

interface ICreateTimeProvider<TProvider> {
  /** Builds the Time-Provider. */
  create(): TProvider;
}

interface IComposeWithTimezone<TBuilder> {
  /**
   * Sets the local timezone.
   * @param timezone The local timezone.
   * @returns This builder.
   */
  withTimezone(timezone: TimezoneDefinition): TBuilder;

  /**
   * Uses the host timezone.
   * @returns This builder.
   */
  withHostTimezone(): TBuilder;

  /**
   * Restores the default timezone (`Etc/UTC`).
   * @returns This builder.
   */
  withDefaultTimezone(): TBuilder;
}

interface IWithRuntime<TDate, TRuntime extends IRuntime<TDate> | IDeterministicRuntime<TDate>> {
  get runtime(): TRuntime;
  applyToRuntime(runtime: TRuntime): void;
}

// _TDate is a phantom type parameter here: it isn't referenced in this interface's own body,
// but every consumer relies on it to constrain an addon to a specific TDate (e.g.
// `registerAddon(addon: IAddon<TDate>)`, `AddonBuilderFactory<TDate, TAddon extends IAddon<TDate>>`).
/** An addon attached by `.use()`. */
export interface IAddon<_TDate> extends IDisposable {}

/** An addon for a system Time-Provider. */
export interface ISystemAddon<TDate> extends IAddon<TDate>, IWithRuntime<TDate, IRuntime<TDate>> {}

/** An addon for a deterministic Time-Provider. */
export interface IDeterministicAddon<TDate>
  extends IAddon<TDate>, IWithRuntime<TDate, IDeterministicRuntime<TDate>> {}

/** Public addon members exposed by a composed Time-Provider. */
type PublicAddonSurface<TDate, TAddon extends IAddon<TDate>> = Omit<
  TAddon,
  keyof IAddon<TDate> | keyof IWithRuntime<TDate, IRuntime<TDate> | IDeterministicRuntime<TDate>>
>;

/** Factory that produces a fresh addon. */
export interface IAddonBuilder<TAddon extends IAddon<any> = IAddon<any>> {
  /** Builds the addon. */
  create(): TAddon;
}

/** Factory for an addon and optional builder extras. */
export type AddonBuilderFactory<TDate, TAddon extends IAddon<TDate>, TBuilderExtra = unknown> = (
  typeHint?: TDate,
) => IAddonBuilder<TAddon> & TBuilderExtra;

/** Public builder extras exposed by `.use()`. */
export type PublicBuilderSurface<TBuilderExtra> = Omit<TBuilderExtra, keyof IAddonBuilder>;

/** Selects a deterministic runtime strategy. */
interface IAsRuntimeBuilders<TFixed, TManual, TSequential> {
  /** Starts a manual Time-Provider. */
  asManual(): TManual;
  /** Starts a fixed Time-Provider. */
  asFixed(): TFixed;
  /** Starts a sequential Time-Provider. */
  asSequential(): TSequential;
}

/** Builds a fixed-time deterministic Time-Provider. */
export interface IFixedRuntimeBuilder<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<IDeterministicTimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<IFixedRuntimeBuilder<TDate, TExtra>> {
  /** Sets the fixed time. */
  withFixedTime(initialDateTime: string | number | TDate): IFixedRuntimeBuilder<TDate, TExtra>;
}

/** Builds a fixed-time deterministic UTC-only Time-Provider. */
interface IUtcOnlyFixedRuntimeBuilder<TDate, TExtra = unknown> extends ICreateTimeProvider<
  IUtcOnlyDeterministicTimeProvider<TDate> & TExtra
> {
  /** Sets the fixed time. */
  withFixedTime(
    initialDateTime: string | number | TDate,
  ): IUtcOnlyFixedRuntimeBuilder<TDate, TExtra>;
}

/** Builds a manual deterministic Time-Provider. */
export interface IManualRuntimeBuilder<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<IManualTimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<IManualRuntimeBuilder<TDate, TExtra>> {
  /** Sets the initial time. */
  withInitialTime(initialDateTime: string | number | TDate): IManualRuntimeBuilder<TDate, TExtra>;
}

/** Builds a manual deterministic UTC-only Time-Provider. */
interface IUtcOnlyManualRuntimeBuilder<TDate, TExtra = unknown> extends ICreateTimeProvider<
  IUtcOnlyManualTimeProvider<TDate> & TExtra
> {
  /** Sets the initial time. */
  withInitialTime(
    initialDateTime: string | number | TDate,
  ): IUtcOnlyManualRuntimeBuilder<TDate, TExtra>;
}

/** Builds a sequential deterministic Time-Provider. */
export interface ISequentialRuntimeBuilder<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<IDeterministicTimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<ISequentialRuntimeBuilder<TDate, TExtra>> {
  /** Adds a sequential time. */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialRuntimeBuilder<TDate, TExtra>;
}

/** Builds a sequential deterministic UTC-only Time-Provider. */
interface IUtcOnlySequentialRuntimeBuilder<TDate, TExtra = unknown> extends ICreateTimeProvider<
  IUtcOnlyDeterministicTimeProvider<TDate> & TExtra
> {
  /** Adds a sequential time. */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): IUtcOnlySequentialRuntimeBuilder<TDate, TExtra>;
}

/** Builds a system Time-Provider, optionally with addons. */
export interface ISystemPluggedRuntimeBuilder<TDate, TExtra = unknown>
  extends
    ICreateTimeProvider<ITimeProvider<TDate> & TExtra>,
    IComposeWithTimezone<ISystemPluggedRuntimeBuilder<TDate, TExtra>> {
  /**
   * Adds an addon.
   * @param addonBuilderFactory The addon builder.
   */
  use<TAddon extends ISystemAddon<TDate>, TBuilderExtra = unknown>(
    addonBuilderFactory: AddonBuilderFactory<TDate, TAddon, TBuilderExtra>,
  ): ISystemPluggedRuntimeBuilder<TDate, TExtra & PublicAddonSurface<TDate, TAddon>> &
    PublicBuilderSurface<TBuilderExtra>;
}

/** Builds a system UTC-only Time-Provider, optionally with addons. */
export interface IUtcOnlySystemPluggedRuntimeBuilder<
  TDate,
  TExtra = unknown,
> extends ICreateTimeProvider<IUtcOnlyTimeProvider<TDate> & TExtra> {
  /**
   * Adds an addon.
   * @param addonBuilderFactory The addon builder.
   */
  use<TAddon extends ISystemAddon<TDate>, TBuilderExtra = unknown>(
    addonBuilderFactory: AddonBuilderFactory<TDate, TAddon, TBuilderExtra>,
  ): IUtcOnlySystemPluggedRuntimeBuilder<TDate, TExtra & PublicAddonSurface<TDate, TAddon>> &
    PublicBuilderSurface<TBuilderExtra>;
}

/** Entry point for building a deterministic Time-Provider. */
export interface IDeterministicPluggedRuntimeBuilder<TDate, TExtra = unknown>
  extends
    IComposeWithTimezone<IDeterministicPluggedRuntimeBuilder<TDate, TExtra>>,
    IAsRuntimeBuilders<
      IFixedRuntimeBuilder<TDate, TExtra>,
      IManualRuntimeBuilder<TDate, TExtra>,
      ISequentialRuntimeBuilder<TDate, TExtra>
    > {
  /**
   * Adds an addon.
   * @param addonBuilderFactory The addon builder.
   */
  use<TAddon extends IDeterministicAddon<TDate>, TBuilderExtra = unknown>(
    addonBuilderFactory: AddonBuilderFactory<TDate, TAddon, TBuilderExtra>,
  ): IDeterministicPluggedRuntimeBuilder<TDate, TExtra & PublicAddonSurface<TDate, TAddon>> &
    PublicBuilderSurface<TBuilderExtra>;
}

/** Entry point for building a deterministic UTC-only Time-Provider. */
export interface IUtcOnlyDeterministicPluggedRuntimeBuilder<
  TDate,
  TExtra = unknown,
> extends IAsRuntimeBuilders<
  IUtcOnlyFixedRuntimeBuilder<TDate, TExtra>,
  IUtcOnlyManualRuntimeBuilder<TDate, TExtra>,
  IUtcOnlySequentialRuntimeBuilder<TDate, TExtra>
> {
  /**
   * Adds an addon.
   * @param addonBuilderFactory The addon builder.
   */
  use<TAddon extends IDeterministicAddon<TDate>, TBuilderExtra = unknown>(
    addonBuilderFactory: AddonBuilderFactory<TDate, TAddon, TBuilderExtra>,
  ): IUtcOnlyDeterministicPluggedRuntimeBuilder<TDate, TExtra & PublicAddonSurface<TDate, TAddon>> &
    PublicBuilderSurface<TBuilderExtra>;
}

/** Factory for system runtime builders. */
export interface IRuntimeBuilder {
  /**
   * Creates a Time-Provider builder.
   * @param adapter The plugin.
   */
  for<TDate>(adapter: IUtcOnlySystemPlugin<TDate>): IUtcOnlySystemPluggedRuntimeBuilder<TDate>;

  /**
   * Creates a Time-Provider builder.
   * @param adapter The plugin.
   */
  for<TDate>(adapter: ISystemPlugin<TDate>): ISystemPluggedRuntimeBuilder<TDate>;
}

/** Factory for deterministic runtime builders. */
export interface IDeterministicRuntimeBuilder {
  /**
   * Creates a deterministic Time-Provider builder.
   * @param adapter The plugin.
   */
  for<TDate>(
    adapter: IUtcOnlyDeterministicPlugin<TDate>,
  ): IUtcOnlyDeterministicPluggedRuntimeBuilder<TDate>;

  /**
   * Creates a deterministic Time-Provider builder.
   * @param adapter The plugin.
   */
  for<TDate>(adapter: IDeterministicPlugin<TDate>): IDeterministicPluggedRuntimeBuilder<TDate>;
}
