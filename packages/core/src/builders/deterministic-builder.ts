import type {
  IDeterministicPlugin,
  IManualRuntime,
  IManualTimeProvider,
  IRuntime,
  ITimeProvider,
  IUtcOnlyDeterministicPlugin,
  TimezoneDefinition,
} from "../types/types.ts";
import type {
  AddonOf,
  IAddonBuilder,
  IDeterministicPluggedRuntimeBuilder,
  IDeterministicRuntimeBuilder,
  IFixedRuntimeBuilder,
  IManualRuntimeBuilder,
  IDeterministicAddon,
  ISequentialRuntimeBuilder,
  IUtcOnlyDeterministicPluggedRuntimeBuilder,
} from "./builders.ts";
import { BaseRuntimeBuilder } from "./builder-base.ts";

type AnyDeterministicPlugin<TDate> =
  | IDeterministicPlugin<TDate>
  | IUtcOnlyDeterministicPlugin<TDate>;

function applyAddonBuilders<TDate>(
  addonBuilders: readonly IAddonBuilder<IDeterministicAddon<TDate>>[],
  runtime: IRuntime<TDate>,
): void {
  for (const addonBuilder of addonBuilders) {
    addonBuilder.create().applyToRuntime(runtime);
  }
}

class FixedRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnyDeterministicPlugin<TDate>>
  implements IFixedRuntimeBuilder<TDate>
{
  #fixedDateTime?: string | number | TDate;
  #addonBuilders: readonly IAddonBuilder<IDeterministicAddon<TDate>>[];

  constructor(
    plugin: AnyDeterministicPlugin<TDate>,
    localTimezone: TimezoneDefinition,
    addonBuilders: readonly IAddonBuilder<IDeterministicAddon<TDate>>[],
  ) {
    super(plugin, localTimezone);
    this.#fixedDateTime = undefined;
    this.#addonBuilders = addonBuilders;
  }
  withFixedTime(initialDateTime: string | number | TDate): IFixedRuntimeBuilder<TDate> {
    this.#fixedDateTime = initialDateTime;
    return this;
  }
  create(): ITimeProvider<TDate> {
    const initialTime = undefined !== this.#fixedDateTime ? this.#fixedDateTime : 0;
    const runtime = this.plugin.supportsLocalTime
      ? this.plugin.createFixedRuntime(this.localTimezone, initialTime)
      : (this.plugin.createFixedRuntime(initialTime) as unknown as IRuntime<TDate>);
    applyAddonBuilders(this.#addonBuilders, runtime);
    return Object.freeze(runtime);
  }
}

class ManualRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnyDeterministicPlugin<TDate>>
  implements IManualRuntimeBuilder<TDate>
{
  #initialDateTime?: string | number | TDate;
  #addonBuilders: readonly IAddonBuilder<IDeterministicAddon<TDate>>[];

  constructor(
    plugin: AnyDeterministicPlugin<TDate>,
    localTimezone: TimezoneDefinition,
    addonBuilders: readonly IAddonBuilder<IDeterministicAddon<TDate>>[],
  ) {
    super(plugin, localTimezone);
    this.#initialDateTime = undefined;
    this.#addonBuilders = addonBuilders;
  }

  withInitialTime(initialDateTime: string | number | TDate): IManualRuntimeBuilder<TDate> {
    this.#initialDateTime = initialDateTime;
    return this;
  }
  create(): IManualTimeProvider<TDate> {
    const initialTime = undefined !== this.#initialDateTime ? this.#initialDateTime : 0;
    const runtime = this.plugin.supportsLocalTime
      ? this.plugin.createManualRuntime(this.localTimezone, initialTime)
      : (this.plugin.createManualRuntime(initialTime) as unknown as IManualRuntime<TDate>);
    applyAddonBuilders(this.#addonBuilders, runtime);
    return Object.freeze(runtime);
  }
}

class SequentialRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnyDeterministicPlugin<TDate>>
  implements ISequentialRuntimeBuilder<TDate>
{
  #sequentialTimes: (string | number | TDate)[] = [];
  #addonBuilders: readonly IAddonBuilder<IDeterministicAddon<TDate>>[];

  constructor(
    plugin: AnyDeterministicPlugin<TDate>,
    localTimezone: TimezoneDefinition,
    addonBuilders: readonly IAddonBuilder<IDeterministicAddon<TDate>>[],
  ) {
    super(plugin, localTimezone);
    this.#addonBuilders = addonBuilders;
  }

  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialRuntimeBuilder<TDate> {
    this.#sequentialTimes.push(sequentialDateTime);
    return this;
  }

  create(): ITimeProvider<TDate> {
    const sequentialTimes = this.#sequentialTimes.length ? this.#sequentialTimes : [0];
    const runtime = this.plugin.supportsLocalTime
      ? this.plugin.createSequentialRuntime(this.localTimezone, sequentialTimes)
      : (this.plugin.createSequentialRuntime(sequentialTimes) as unknown as IRuntime<TDate>);
    applyAddonBuilders(this.#addonBuilders, runtime);
    return Object.freeze(runtime);
  }
}

class DeterministicPluggedRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnyDeterministicPlugin<TDate>>
  implements IDeterministicPluggedRuntimeBuilder<TDate>
{
  #addonBuilders: IAddonBuilder<IDeterministicAddon<TDate>>[] = [];

  constructor(plugin: AnyDeterministicPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
  }

  use<TFactory extends () => IAddonBuilder<IDeterministicAddon<TDate>>>(
    addonBuilderFactory: TFactory,
  ): IDeterministicPluggedRuntimeBuilder<TDate, AddonOf<ReturnType<TFactory>>> &
    Omit<ReturnType<TFactory>, "create"> {
    const addonBuilder: IAddonBuilder<IDeterministicAddon<TDate>> = addonBuilderFactory();
    BaseRuntimeBuilder.assertNoAddonCollision(this, addonBuilder);
    this.#addonBuilders.push(addonBuilder);
    BaseRuntimeBuilder.spliceAddonExtras(this, addonBuilder);
    return this as unknown as IDeterministicPluggedRuntimeBuilder<
      TDate,
      AddonOf<ReturnType<TFactory>>
    > &
      Omit<ReturnType<TFactory>, "create">;
  }

  asManual(): IManualRuntimeBuilder<TDate> {
    return Object.freeze(
      new ManualRuntimeBuilder(this.plugin, this.localTimezone, this.#addonBuilders),
    );
  }
  asFixed(): IFixedRuntimeBuilder<TDate> {
    return Object.freeze(
      new FixedRuntimeBuilder(this.plugin, this.localTimezone, this.#addonBuilders),
    );
  }
  asSequential(): ISequentialRuntimeBuilder<TDate> {
    return Object.freeze(
      new SequentialRuntimeBuilder(this.plugin, this.localTimezone, this.#addonBuilders),
    );
  }
}

class DeterministicRuntimeBuilder implements IDeterministicRuntimeBuilder {
  /*
    The underlying runtime objects always have the full capability regardless of which overload matched.
    Only the declared type at this boundary is restricted for IUtcOnlyDeterministicPlugin adapters, so this widening is safe.
  */
  for<TDate>(
    adapter: IUtcOnlyDeterministicPlugin<TDate>,
  ): IUtcOnlyDeterministicPluggedRuntimeBuilder<TDate>;
  for<TDate>(adapter: IDeterministicPlugin<TDate>): IDeterministicPluggedRuntimeBuilder<TDate>;
  for<TDate>(
    adapter: AnyDeterministicPlugin<TDate>,
  ):
    | IDeterministicPluggedRuntimeBuilder<TDate>
    | IUtcOnlyDeterministicPluggedRuntimeBuilder<TDate> {
    return new DeterministicPluggedRuntimeBuilder(adapter, "Etc/UTC");
  }
}

/**
 * Entry point for building a deterministic (manual/fixed/sequential) Time-Provider. Exposed by
 * the package as `createTimeProvider` from the `@time-provider/core/deterministic` entry point.
 *
 * @example
 * ```ts
 * const timeProvider = createTimeProvider.for(dayjsPlugin).asFixed().withFixedTime("2024-01-01").create();
 * ```
 */
export const createDeterministicTimeProvider: IDeterministicRuntimeBuilder =
  new DeterministicRuntimeBuilder();
