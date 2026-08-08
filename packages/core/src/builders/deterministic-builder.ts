import type {
  IDeterministicPlugin,
  IManualTimeProvider,
  ITimeProvider,
  IUtcOnlyDeterministicPlugin,
  TimezoneDefinition,
} from "../types/types.ts";
import type {
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

function applyAddons<TDate>(
  addons: readonly IDeterministicAddon<TDate, unknown>[],
  runtime: ITimeProvider<TDate> | IManualTimeProvider<TDate>,
): void {
  for (const addon of addons) {
    addon.applyToRuntime(runtime);
  }
}

class FixedRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnyDeterministicPlugin<TDate>>
  implements IFixedRuntimeBuilder<TDate>
{
  #fixedDateTime?: string | number | TDate;
  #addons: readonly IDeterministicAddon<TDate, unknown>[];

  constructor(
    plugin: AnyDeterministicPlugin<TDate>,
    localTimezone: TimezoneDefinition,
    addons: readonly IDeterministicAddon<TDate, unknown>[],
  ) {
    super(plugin, localTimezone);
    this.#fixedDateTime = undefined;
    this.#addons = addons;
  }
  withFixedTime(initialDateTime: string | number | TDate): IFixedRuntimeBuilder<TDate> {
    this.#fixedDateTime = initialDateTime;
    return this;
  }
  create(): ITimeProvider<TDate> {
    const initialTime = undefined !== this.#fixedDateTime ? this.#fixedDateTime : 0;
    const runtime = this.plugin.supportsLocalTime
      ? this.plugin.createFixedRuntime(this.localTimezone, initialTime)
      : (this.plugin.createFixedRuntime(initialTime) as unknown as ITimeProvider<TDate>);
    applyAddons(this.#addons, runtime);
    return Object.freeze(runtime);
  }
}

class ManualRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnyDeterministicPlugin<TDate>>
  implements IManualRuntimeBuilder<TDate>
{
  #initialDateTime?: string | number | TDate;
  #addons: readonly IDeterministicAddon<TDate, unknown>[];

  constructor(
    plugin: AnyDeterministicPlugin<TDate>,
    localTimezone: TimezoneDefinition,
    addons: readonly IDeterministicAddon<TDate, unknown>[],
  ) {
    super(plugin, localTimezone);
    this.#initialDateTime = undefined;
    this.#addons = addons;
  }

  withInitialTime(initialDateTime: string | number | TDate): IManualRuntimeBuilder<TDate> {
    this.#initialDateTime = initialDateTime;
    return this;
  }
  create(): IManualTimeProvider<TDate> {
    const initialTime = undefined !== this.#initialDateTime ? this.#initialDateTime : 0;
    const runtime = this.plugin.supportsLocalTime
      ? this.plugin.createManualRuntime(this.localTimezone, initialTime)
      : (this.plugin.createManualRuntime(initialTime) as unknown as IManualTimeProvider<TDate>);
    applyAddons(this.#addons, runtime);
    return Object.freeze(runtime);
  }
}

class SequentialRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnyDeterministicPlugin<TDate>>
  implements ISequentialRuntimeBuilder<TDate>
{
  #sequentialTimes: (string | number | TDate)[] = [];
  #addons: readonly IDeterministicAddon<TDate, unknown>[];

  constructor(
    plugin: AnyDeterministicPlugin<TDate>,
    localTimezone: TimezoneDefinition,
    addons: readonly IDeterministicAddon<TDate, unknown>[],
  ) {
    super(plugin, localTimezone);
    this.#addons = addons;
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
      : (this.plugin.createSequentialRuntime(sequentialTimes) as unknown as ITimeProvider<TDate>);
    applyAddons(this.#addons, runtime);
    return Object.freeze(runtime);
  }
}

class DeterministicPluggedRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnyDeterministicPlugin<TDate>>
  implements IDeterministicPluggedRuntimeBuilder<TDate>
{
  #addons: IDeterministicAddon<TDate, unknown>[] = [];

  constructor(plugin: AnyDeterministicPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
  }

  use<TAddonExtra, TBuilderExtra = unknown>(
    addon: IDeterministicAddon<TDate, TAddonExtra> & TBuilderExtra,
  ): IDeterministicPluggedRuntimeBuilder<TDate, TAddonExtra> & TBuilderExtra {
    const instance = addon.clone();
    BaseRuntimeBuilder.assertNoAddonCollision(this, instance);
    this.#addons.push(instance as IDeterministicAddon<TDate, unknown>);
    BaseRuntimeBuilder.spliceAddonExtras(this, instance);
    return this as unknown as IDeterministicPluggedRuntimeBuilder<TDate, TAddonExtra> &
      TBuilderExtra;
  }

  asManual(): IManualRuntimeBuilder<TDate> {
    return Object.freeze(new ManualRuntimeBuilder(this.plugin, this.localTimezone, this.#addons));
  }
  asFixed(): IFixedRuntimeBuilder<TDate> {
    return Object.freeze(new FixedRuntimeBuilder(this.plugin, this.localTimezone, this.#addons));
  }
  asSequential(): ISequentialRuntimeBuilder<TDate> {
    return Object.freeze(
      new SequentialRuntimeBuilder(this.plugin, this.localTimezone, this.#addons),
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
