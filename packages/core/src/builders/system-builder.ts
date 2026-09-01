import type {
  IRuntime,
  ISystemPlugin,
  ITimeProvider,
  IUtcOnlySystemPlugin,
  TimezoneDefinition,
} from "../types/types.ts";
import type {
  AddonOf,
  IAddonBuilder,
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
  #addonBuilders: IAddonBuilder<ISystemAddon<TDate>>[] = [];

  constructor(plugin: AnySystemPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
  }

  use<TFactory extends () => IAddonBuilder<ISystemAddon<TDate>>>(
    addonBuilderFactory: TFactory,
  ): ISystemPluggedRuntimeBuilder<TDate, AddonOf<ReturnType<TFactory>>> &
    Omit<ReturnType<TFactory>, "create"> {
    const addonBuilder: IAddonBuilder<ISystemAddon<TDate>> = addonBuilderFactory();
    BaseRuntimeBuilder.assertNoAddonCollision(this, addonBuilder);
    this.#addonBuilders.push(addonBuilder);
    BaseRuntimeBuilder.spliceAddonExtras(this, addonBuilder);
    return this as unknown as ISystemPluggedRuntimeBuilder<TDate, AddonOf<ReturnType<TFactory>>> &
      Omit<ReturnType<TFactory>, "create">;
  }

  create(): ITimeProvider<TDate> {
    const runtime = this.plugin.supportsLocalTime
      ? this.plugin.createSystemRuntime(this.localTimezone)
      : (this.plugin.createSystemRuntime() as unknown as IRuntime<TDate>);
    for (const addonBuilder of this.#addonBuilders) {
      addonBuilder.create().applyToRuntime(runtime);
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
