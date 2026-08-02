import type {
  ISystemPlugin,
  ITimeProvider,
  IUtcOnlySystemPlugin,
  TimezoneDefinition,
} from "../types/types.ts";
import type {
  ISystemPluggedRuntimeBuilder,
  ISystemAddon,
  IRuntimeBuilder,
  IUtcOnlySystemPluggedRuntimeBuilder,
} from "./builders.ts";
import { BaseRuntimeBuilder } from "./builder-base.ts";

type AnySystemPlugin<TDate> = ISystemPlugin<TDate> | IUtcOnlySystemPlugin<TDate>;

class SystemPluggedRuntimeBuilder<TDate>
  extends BaseRuntimeBuilder<AnySystemPlugin<TDate>>
  implements ISystemPluggedRuntimeBuilder<TDate>
{
  #addons: ISystemAddon<TDate, unknown>[] = [];

  constructor(plugin: AnySystemPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
  }

  use<TAddonExtra, TBuilderExtra = unknown>(
    addon: ISystemAddon<TDate, TAddonExtra> & TBuilderExtra,
  ): ISystemPluggedRuntimeBuilder<TDate, TAddonExtra> & TBuilderExtra {
    const instance = addon.clone();
    BaseRuntimeBuilder.assertNoAddonCollision(this, instance);
    this.#addons.push(instance as ISystemAddon<TDate, unknown>);
    Object.assign(this, instance);
    return this as unknown as ISystemPluggedRuntimeBuilder<TDate, TAddonExtra> & TBuilderExtra;
  }

  create(): ITimeProvider<TDate> {
    const runtime = this.plugin.supportsLocalTime
      ? this.plugin.createSystemRuntime(this.localTimezone)
      : (this.plugin.createSystemRuntime() as unknown as ITimeProvider<TDate>);
    for (const addon of this.#addons) {
      addon.applyToRuntime(runtime);
    }
    return Object.freeze(runtime);
  }
}

/**
 * Default implementation of {@link IRuntimeBuilder}, exposed as the {@link createTimeProvider} singleton.
 */
export class RuntimeBuilder implements IRuntimeBuilder {
  /*
    The underlying runtime objects always have the full capability regardless of which overload matched.
    Only the declared type at this boundary is restricted for IUtcOnlySystemPlugin adapters, so this widening is safe.
  */
  for<TDate>(adapter: IUtcOnlySystemPlugin<TDate>): IUtcOnlySystemPluggedRuntimeBuilder<TDate>;
  for<TDate>(adapter: ISystemPlugin<TDate>): ISystemPluggedRuntimeBuilder<TDate>;
  for<TDate>(
    adapter: AnySystemPlugin<TDate>,
  ): ISystemPluggedRuntimeBuilder<TDate> | IUtcOnlySystemPluggedRuntimeBuilder<TDate> {
    return new SystemPluggedRuntimeBuilder(adapter, "Etc/UTC");
  }
}

/**
 * Entry point for building a system (real time) Time-Provider.
 *
 * @example
 * ```ts
 * const timeProvider = createTimeProvider.for(dayjsPlugin).create();
 * ```
 */
export const createTimeProvider: IRuntimeBuilder = new RuntimeBuilder();
