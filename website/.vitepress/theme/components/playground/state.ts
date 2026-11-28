import {
  computed,
  inject,
  provide,
  type InjectionKey,
  markRaw,
  nextTick,
  onBeforeUnmount,
  reactive,
  ref,
  shallowRef,
  watch,
} from "vue";
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin as nativePlugin } from "@time-provider/plugin-native";
import { plugin as nativeDeterministicPlugin } from "@time-provider/plugin-native/deterministic";
import { plugin as dayjsPlugin } from "@time-provider/plugin-dayjs";
import { plugin as dayjsDeterministicPlugin } from "@time-provider/plugin-dayjs/deterministic";
import { plugin as luxonPlugin } from "@time-provider/plugin-luxon";
import { plugin as luxonDeterministicPlugin } from "@time-provider/plugin-luxon/deterministic";
import { plugin as momentPlugin } from "@time-provider/plugin-moment";
import { plugin as momentDeterministicPlugin } from "@time-provider/plugin-moment/deterministic";
import { plugin as momentTimezonePlugin } from "@time-provider/plugin-moment-timezone";
import { plugin as momentTimezoneDeterministicPlugin } from "@time-provider/plugin-moment-timezone/deterministic";
// plugin-temporal assumes a global `Temporal` is already available - browsers/Node don't
// ship the TC39 proposal natively yet, so seed it from the polyfill before either plugin
// is ever asked to actually read a Temporal.ZonedDateTime (module load is safe either way).
import { Temporal } from "@js-temporal/polyfill";
if (typeof globalThis !== "undefined" && !("Temporal" in globalThis)) {
  (globalThis as unknown as { Temporal: unknown }).Temporal = Temporal;
}
import { plugin as temporalPlugin } from "@time-provider/plugin-temporal";
import { plugin as temporalDeterministicPlugin } from "@time-provider/plugin-temporal/deterministic";
import { addon as animationFrameAddon } from "@time-provider/addon-animation-frame";
import { addon as animationFrameDeterministicAddon } from "@time-provider/addon-animation-frame/deterministic";
import { addon as cronAddon } from "@time-provider/addon-cron";
import { addon as cronDeterministicAddon } from "@time-provider/addon-cron/deterministic";
import { addon as etaAddon } from "@time-provider/addon-eta";
import { addon as etaDeterministicAddon } from "@time-provider/addon-eta/deterministic";
import { addon as idleAddon } from "@time-provider/addon-idle";
import { addon as idleDeterministicAddon } from "@time-provider/addon-idle/deterministic";
import { copyToClipboard } from "../../clipboard";
import { highlightTs } from "../../shiki";
import type { ITimingEntry, ITimingsFilter } from "@time-provider/core";
import type { IManualTimeProvider } from "@time-provider/core/deterministic";
import type { WithAnimationFrameApi } from "@time-provider/addon-animation-frame";
import type { ICronSpec, WithCronApi } from "@time-provider/addon-cron";
import type { WithEtaApi } from "@time-provider/addon-eta";
import type { WithIdleApi } from "@time-provider/addon-idle";

type Strategy = "system" | "fixed" | "manual" | "sequential";
// What the Scheduler panel's own dropdown offers - one entry per ITimers method.
type SchedulerTimerKind = "once" | "every" | "recurring";
// Plus the addon-backed panels, which schedule through their addon's own entry on `.scheduler`
// (`.scheduler.cron`, `.scheduler.idle`, `.scheduler.animation`) rather than `.scheduler.timers`,
// but end up in the same row list so a rebuild can clear everything at once.
type TimerKind = SchedulerTimerKind | "raf" | "cron" | "idle";

interface PluginOption {
  key: string;
  label: string;
  importName: string;
  // The system and deterministic entry points each export their own plugin instance - a system
  // plugin only type-checks against `createTimeProvider` from "@time-provider/core", and a
  // deterministic one only against "@time-provider/core/deterministic". See /guide/mental-model.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  systemPlugin: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deterministicPlugin: any;
}

interface AddonOption {
  key: string;
  label: string;
  // Local identifier used for this addon's import/`.use(...)` call in the generated "equivalent
  // code" snippet - distinct per addon so two addons enabled together don't both import as the
  // same `addon` binding.
  varName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  systemAddon: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deterministicAddon: any;
  importName: string;
}

// The builder's own model of one ICronSpec field (minute/hour/dayOfMonth/month/dayOfWeek) -
// mirrors the library's CronFieldSpec shape ("*" | value | range | array of either) closely
// enough to derive both a real ICronSpec and its equivalent cron expression string from the
// same state.
export interface CronFieldMeta {
  key: "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";
  label: string;
  min: number;
  max: number;
  names?: readonly string[];
}

export interface CronAtom {
  id: number;
  mode: "value" | "range";
  // Bound to either a <select> (always a string - a MonthName/DayOfWeekName) or a native
  // <input type="number"> - Vue 3.4+ auto-casts those v-model bindings to an actual number, so
  // these can't be typed as plain `string` even though `makeCronAtom` seeds them as strings.
  value: string | number;
  from: string | number;
  to: string | number;
  step: string | number;
}
interface CronFieldState {
  wildcard: boolean;
  atoms: CronAtom[];
}

type EtaMode = "known-total" | "stages" | "duration";
type EtaAlgorithm = "complete" | "windowed" | "smoothed";

// The builder chain is assembled from runtime choices - plugin, strategy, addons - so no static
// type follows it. This is the widest shape the panels reach for: a manual provider, the strategy
// with the largest surface (local time, `advance`, microtasks that drain), plus every addon's
// facet. A narrower type would need the union of all four strategies narrowed at each call site,
// while every panel already guards itself on the flag that decided whether it renders at all.
type PlaygroundProvider = IManualTimeProvider<unknown> &
  WithAnimationFrameApi<unknown> &
  WithCronApi<unknown> &
  WithEtaApi<unknown> &
  WithIdleApi;

export interface TimerRow {
  id: number;
  kind: TimerKind;
  label: string;
  delayMs: number;
  expression?: string;
  // Recurring only, and mutated by the schedule's own callback so the row tracks it live.
  runs?: number;
  maxRuns?: number;
  nextDelayMs?: number;
  stopped?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: any;
}

function createPlayground() {
  const pluginOptions: PluginOption[] = [
    {
      key: "native",
      label: "Native Date",
      importName: "plugin-native",
      systemPlugin: nativePlugin,
      deterministicPlugin: nativeDeterministicPlugin,
    },
    {
      key: "dayjs",
      label: "Day.js",
      importName: "plugin-dayjs",
      systemPlugin: dayjsPlugin,
      deterministicPlugin: dayjsDeterministicPlugin,
    },
    {
      key: "luxon",
      label: "Luxon",
      importName: "plugin-luxon",
      systemPlugin: luxonPlugin,
      deterministicPlugin: luxonDeterministicPlugin,
    },
    {
      key: "moment",
      label: "Moment.js",
      importName: "plugin-moment",
      systemPlugin: momentPlugin,
      deterministicPlugin: momentDeterministicPlugin,
    },
    {
      key: "moment-timezone",
      label: "Moment.js + moment-timezone",
      importName: "plugin-moment-timezone",
      systemPlugin: momentTimezonePlugin,
      deterministicPlugin: momentTimezoneDeterministicPlugin,
    },
    {
      key: "temporal",
      label: "Temporal",
      importName: "plugin-temporal",
      systemPlugin: temporalPlugin,
      deterministicPlugin: temporalDeterministicPlugin,
    },
  ];

  const addonOptions: AddonOption[] = [
    {
      key: "animation-frame",
      label: "Animation Frame API",
      varName: "animationFrameAddon",
      systemAddon: animationFrameAddon,
      deterministicAddon: animationFrameDeterministicAddon,
      importName: "addon-animation-frame",
    },
    {
      key: "cron",
      label: "Cron",
      varName: "cronAddon",
      systemAddon: cronAddon,
      deterministicAddon: cronDeterministicAddon,
      importName: "addon-cron",
    },
    {
      key: "eta",
      label: "ETA",
      systemAddon: etaAddon,
      deterministicAddon: etaDeterministicAddon,
      importName: "addon-eta",
      varName: "etaAddon",
    },
    {
      key: "idle",
      label: "Idle Callback API",
      varName: "idleAddon",
      systemAddon: idleAddon,
      deterministicAddon: idleDeterministicAddon,
      importName: "addon-idle",
    },
  ];

  const CRON_FIELDS: CronFieldMeta[] = [
    { key: "minute", label: "Minute", min: 0, max: 59 },
    { key: "hour", label: "Hour", min: 0, max: 23 },
    { key: "dayOfMonth", label: "Day of month", min: 1, max: 31 },
    {
      key: "month",
      label: "Month",
      min: 1,
      max: 12,
      names: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
    },
    {
      key: "dayOfWeek",
      label: "Day of week",
      min: 0,
      max: 6,
      names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    },
  ];

  const strategies: { key: Strategy; label: string }[] = [
    { key: "system", label: "System" },
    { key: "fixed", label: "Fixed" },
    { key: "manual", label: "Manual" },
    { key: "sequential", label: "Sequential" },
  ];

  const strategyHints: Record<Strategy, string> = {
    system: "Real time, real timers.",
    fixed: "Always the same instant. Timers never fire.",
    manual: "Moves only via moveBy(), moveTo() or moveUntil(). Timers fire in-line when due.",
    sequential: "Each read consumes the next instant. Timers fire in-line when due.",
  };

  const schedulerModeLabels: Record<Strategy, string> = {
    system: "async · real timers",
    fixed: "never fires",
    manual: "sync · in-line",
    sequential: "sync · in-line",
  };

  const selectedPluginKey = ref("native");
  const enabledAddons = ref<string[]>([]);
  const selectedStrategy = ref<Strategy>("manual");
  const timezone = ref("Etc/UTC");
  const useHostTz = ref(false);
  const fixedTime = ref("2026-01-01T00:00:00.000Z");
  const initialTime = ref("2026-01-01T00:00:00.000Z");
  const sequentialTimes = ref<string[]>([
    "2026-01-01T00:00:01.000Z",
    "2026-01-01T00:00:02.000Z",
    "2026-01-01T00:00:03.000Z",
  ]);

  const advanceAmount = ref(1);
  const advanceUnit = ref<
    "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years"
  >("seconds");
  const moveAs = ref<"flow" | "sleep" | "snap">("flow");

  const timerLabel = ref("Tick");
  const timerKind = ref<SchedulerTimerKind>("every");
  const timerDelay = ref(1000);

  const microtaskLabel = ref("Microtask");

  // A recurring schedule computes its next delay from the run that just happened, so the playground
  // needs a rule for that: start at `recurringInitialDelay`, multiply by `recurringFactor` after
  // every run (factor 1 behaves exactly like `every`), and return `false` once
  // `recurringMaxRuns` runs have happened. The run cap is mandatory rather than optional: on a
  // manual clock a single moveBy() drains everything already due, so an unbounded schedule with a
  // small delay would spin in-line until the browser gave up.
  const RECURRING_MAX_RUNS = 1000;
  const recurringInitialDelay = ref(1000);
  const recurringFactor = ref(2);
  const recurringMaxRuns = ref(5);

  const frameLabel = ref("Frame");

  const idleLabel = ref("Idle");

  const cronLabel = ref("Nightly");
  const cronExpression = ref("* * * * *");

  const cronInputMode = ref<"expression" | "builder">("expression");
  let cronAtomId = 1;
  function makeCronAtom(field: CronFieldMeta): CronAtom {
    const initial = field.names ? field.names[0] : String(field.min);
    return {
      id: cronAtomId++,
      mode: "value",
      value: initial,
      from: initial,
      to: initial,
      step: "",
    };
  }
  // Spelled out rather than built from CRON_FIELDS: `Object.fromEntries` can only produce an index
  // signature, so keying it off the field list needed a cast that hid whether every field was
  // actually covered. Written this way the compiler is the one checking.
  const emptyCronField = (): CronFieldState => ({ wildcard: true, atoms: [] });
  const cronBuilder = reactive<Record<CronFieldMeta["key"], CronFieldState>>({
    minute: emptyCronField(),
    hour: emptyCronField(),
    dayOfMonth: emptyCronField(),
    month: emptyCronField(),
    dayOfWeek: emptyCronField(),
  });
  function addCronAtom(field: CronFieldMeta) {
    cronBuilder[field.key].atoms.push(makeCronAtom(field));
  }
  function removeCronAtom(field: CronFieldMeta, atomId: number) {
    const state = cronBuilder[field.key];
    state.atoms = state.atoms.filter((a) => a.id !== atomId);
  }

  function cronFieldExpression(state: CronFieldState): string {
    if (state.wildcard || state.atoms.length === 0) return "*";
    return state.atoms
      .map((atom) => {
        if (atom.mode === "value") return String(atom.value).trim() || "*";
        const step = String(atom.step).trim();
        return step ? `${atom.from}-${atom.to}/${step}` : `${atom.from}-${atom.to}`;
      })
      .join(",");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function cronFieldSpecValue(field: CronFieldMeta, state: CronFieldState): any {
    if (state.wildcard || state.atoms.length === 0) return "*";
    // Names (month/dayOfWeek) are entered via <select>, always a valid name string already; a
    // numeric field's value arrives as a number (Vue 3.4+ auto-casts type="number" v-model
    // bindings) or occasionally still a numeric string, so normalize either through Number().
    const endpoint = (raw: string | number) => (field.names ? raw : Number(raw));
    const atoms = state.atoms.map((atom) => {
      if (atom.mode === "value") return endpoint(atom.value);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const range: any = { from: endpoint(atom.from), to: endpoint(atom.to) };
      const step = String(atom.step).trim();
      if (step) range.step = Number(step);
      return range;
    });
    return atoms.length === 1 ? atoms[0] : atoms;
  }

  const cronBuilderExpression = computed(() =>
    CRON_FIELDS.map((f) => cronFieldExpression(cronBuilder[f.key])).join(" "),
  );
  const cronBuilderSpec = computed<ICronSpec>(() => {
    // Assembled by field key from the panel's own state - CRON_FIELDS' keys are exactly
    // ICronSpec's, so it is built untyped and handed over as one once complete.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spec: Record<string, any> = {};
    for (const f of CRON_FIELDS) {
      spec[f.key] = cronFieldSpecValue(f, cronBuilder[f.key]);
    }
    return spec as ICronSpec;
  });
  const cronBuilderJson = computed(() => JSON.stringify(cronBuilderSpec.value, null, 2));

  const etaMode = ref<EtaMode>("known-total");
  const etaTotal = ref(100);
  const etaStages = ref<{ weight: number; total: number }[]>([
    { weight: 1, total: 100 },
    { weight: 1, total: 100 },
  ]);
  const etaDurationMs = ref(5000);
  const etaNotificationInterval = ref(1000);
  const etaAlgorithm = ref<EtaAlgorithm>("windowed");
  const etaProgressChunk = ref(10);
  const etaProgressToValue = ref(50);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const etaTracker = shallowRef<any>(null);
  // shallowRef, not ref: the snapshot classes use private (#-prefixed) fields for their lazy
  // getters - wrapping one in Vue's deep reactive Proxy makes those getters run with `this` bound
  // to the proxy instead of the real instance, and private-field access throws in that case
  // ("Cannot read private member ... from an object whose class did not declare it").
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const etaSnapshot = shallowRef<any>(null);
  const etaStatusLabel = computed(() => etaSnapshot.value?.status ?? "idle");
  // IStagedEtaProgressSnapshot doesn't declare `percentage` - only the stage-scoped
  // `stagePercentage` - see its doc comment for why.
  const etaPercentage = computed(() =>
    etaMode.value === "stages" ? etaSnapshot.value?.stagePercentage : etaSnapshot.value?.percentage,
  );

  const selectedPlugin = computed(
    () => pluginOptions.find((p) => p.key === selectedPluginKey.value) ?? pluginOptions[0],
  );
  const supportsLocalTime = computed(() =>
    Boolean(selectedPlugin.value.systemPlugin.supportsLocalTime),
  );
  const hasAnimationFrameAddon = computed(() => enabledAddons.value.includes("animation-frame"));
  const hasCronAddon = computed(() => enabledAddons.value.includes("cron"));
  const hasEtaAddon = computed(() => enabledAddons.value.includes("eta"));
  const hasIdleAddon = computed(() => enabledAddons.value.includes("idle"));
  const enabledAddonList = computed(() =>
    addonOptions.filter((a) => enabledAddons.value.includes(a.key)),
  );
  const addonsHint = computed(() => {
    const hints: string[] = [];
    if (hasAnimationFrameAddon.value)
      hints.push(".scheduler.animation in the Animation Frame panel");
    if (hasCronAddon.value) hints.push(".scheduler.cron in the Cron panel");
    if (hasEtaAddon.value) hints.push(".eta in the ETA panel");
    if (hasIdleAddon.value) hints.push(".scheduler.idle in the Idle Callback panel");
    return hints.length > 0 ? hints.join(" · ") : "Adds extra facades to the built provider";
  });
  const strategyHint = computed(() => strategyHints[selectedStrategy.value]);
  const strategyLabel = computed(
    () => strategies.find((s) => s.key === selectedStrategy.value)?.label ?? selectedStrategy.value,
  );
  const schedulerModeLabel = computed(() => schedulerModeLabels[selectedStrategy.value]);

  // Each pane in the main column can be folded away to keep the ones being worked with in view.
  // Collapsing only hides the pane's body (`v-show`), so a timer registered from a pane keeps
  // running - and keeps logging - while it's folded.
  const openPanes = reactive({
    clock: true,
    scheduler: true,
    timings: true,
    frame: true,
    cron: true,
    eta: true,
    idle: true,
    log: true,
  });
  function togglePane(key: keyof typeof openPanes) {
    openPanes[key] = !openPanes[key];
  }

  const timeProvider = shallowRef<PlaygroundProvider | null>(null);
  const buildError = ref("");
  const utcReadout = ref("—");
  const localReadout = ref("—");
  const remainingSequential = ref<number | null>(null);

  const logEl = ref<HTMLElement | null>(null);
  const LOG_TOP_THRESHOLD = 4;

  let nextId = 1;
  const log = ref<{ id: number; time: string; kind: string; msg: string }[]>([]);
  // Rendered newest-first (`.pg-log` is a normal, non-reversed flex column), so `logEl`'s scrollTop
  // keeps the standard, cross-browser-consistent meaning: 0 is pinned to the top (newest entry).
  const reversedLog = computed(() => log.value.slice().reverse());

  function pushLog(kind: string, msg: string) {
    const el = logEl.value;
    const wasAtTop = !el || el.scrollTop <= LOG_TOP_THRESHOLD;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    log.value.push({ id: nextId++, time: new Date().toLocaleTimeString(), kind, msg });
    if (log.value.length > 300) log.value.shift();

    void nextTick(() => {
      if (!el) return;
      if (wasAtTop) {
        // Pin to the newest entry.
        el.scrollTop = 0;
      } else {
        // The new entry is inserted above whatever the user is currently reading - shift scrollTop
        // by the resulting height delta so that content stays visually in place.
        el.scrollTop += el.scrollHeight - prevScrollHeight;
      }
    });
  }

  function clearLog() {
    log.value = [];
  }

  const timerRows = ref<TimerRow[]>([]);

  const schedulerRows = computed(() =>
    timerRows.value.filter((r) => r.kind !== "raf" && r.kind !== "cron" && r.kind !== "idle"),
  );
  const frameRows = computed(() => timerRows.value.filter((r) => r.kind === "raf"));
  const cronRows = computed(() => timerRows.value.filter((r) => r.kind === "cron"));
  const idleRows = computed(() => timerRows.value.filter((r) => r.kind === "idle"));

  function describeTimer(row: TimerRow): string {
    switch (row.kind) {
      case "once":
        return `"${row.label}" once, ${row.delayMs}ms out`;
      case "every":
        return `"${row.label}" every ${row.delayMs}ms`;
      case "recurring":
        if (row.stopped) return `"${row.label}" stopped after ${row.runs}/${row.maxRuns} runs`;
        return row.runs === 0
          ? `"${row.label}" first run ${row.delayMs}ms out, up to ${row.maxRuns} runs`
          : `"${row.label}" run ${row.runs}/${row.maxRuns}, next in ${row.nextDelayMs}ms`;
      case "raf":
        return `"${row.label}" pending frame`;
      case "idle":
        return `"${row.label}" pending idle callback`;
      default:
        return `"${row.label}" (${row.expression})`;
    }
  }

  function cancelTimer(row: TimerRow) {
    try {
      row.handle?.dispose?.();
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function clearAllTimers() {
    if (!timeProvider.value) return;
    for (const row of timerRows.value) cancelTimer(row);
    timerRows.value = [];
  }

  function clearEtaTracker() {
    // On the system strategy this stops a real, native every call - without this, rebuilding the
    // provider (e.g. switching plugins) would otherwise leak it, still ticking against a runtime
    // that's no longer reachable from anywhere else.
    if (etaTracker.value) {
      try {
        etaTracker.value.abandon();
      } catch {
        /* already ended */
      }
    }
    etaTracker.value = null;
    etaSnapshot.value = null;
  }

  function formatValue(value: unknown, isLocal: boolean): string {
    if (value === null || value === undefined) return String(value);
    const v = value as Record<string, unknown>;
    if (isLocal && typeof v.format === "function") return (v.format as () => string)();
    if (typeof v.toISO === "function") return (v.toISO as () => string)();
    if (typeof v.toISOString === "function") return (v.toISOString as () => string)();
    return String(value as { toString(): string });
  }

  function useHostTimezone() {
    try {
      timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
      useHostTz.value = true;
    } catch {
      /* Intl unavailable - leave timezone as-is */
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withTimezoneOption(builder: any): any {
    if (!supportsLocalTime.value) return builder;
    return useHostTz.value
      ? builder.withHostTimezone()
      : builder.withTimezone(timezone.value.trim() || "Etc/UTC");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withAddons(builder: any, isSystem: boolean): any {
    for (const addon of addonOptions) {
      if (enabledAddons.value.includes(addon.key)) {
        builder = builder.use(isSystem ? addon.systemAddon : addon.deterministicAddon);
      }
    }
    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withStrategy(builder: any): any {
    switch (selectedStrategy.value) {
      case "fixed":
        return builder.asFixed().withFixedTime(fixedTime.value.trim());
      case "manual":
        return builder.asManual().withInitialTime(initialTime.value.trim());
      case "sequential": {
        const times = sequentialTimes.value.map((t) => t.trim()).filter(Boolean);
        remainingSequential.value = times.length;
        return times.reduce((b, t) => b.withSequentialTime(t), builder.asSequential());
      }
      default:
        return builder;
    }
  }

  function buildProvider() {
    clearAllTimers();
    clearEtaTracker();
    buildError.value = "";
    utcReadout.value = "—";
    localReadout.value = "—";
    remainingSequential.value = null;
    monotonicReadout.value = "—";
    log.value = [];

    try {
      // System is built from `createTimeProvider` ("@time-provider/core"); fixed/manual/sequential
      // are built from the separate deterministic entry point, each with its own plugin instance -
      // see /guide/mental-model for why the two are split rather than one unified builder.
      const isSystem = selectedStrategy.value === "system";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let builder: any = isSystem
        ? createTimeProvider.for(selectedPlugin.value.systemPlugin)
        : createDeterministicTimeProvider.for(selectedPlugin.value.deterministicPlugin);

      builder = withAddons(withTimezoneOption(builder), isSystem);
      timeProvider.value = withStrategy(builder).create();
      refreshTimings();
      const addonSuffix = enabledAddonList.value.map((a) => ` + ${a.label} addon`).join("");
      pushLog(
        "tick",
        `Built ${selectedPlugin.value.label} · ${selectedStrategy.value} provider${addonSuffix}`,
      );
    } catch (e) {
      buildError.value = e instanceof Error ? e.message : String(e);
      timeProvider.value = null;
      refreshTimings();
    }
  }

  function readUtc() {
    if (!timeProvider.value) return;
    try {
      const v = timeProvider.value.clock.utcNow();
      utcReadout.value = formatValue(v, false);
      if (selectedStrategy.value === "sequential" && remainingSequential.value !== null) {
        remainingSequential.value = Math.max(0, remainingSequential.value - 1);
      }
      pushLog("tick", `utcNow() → ${utcReadout.value}`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  const monotonicReadout = ref("—");
  const monotonicOriginReadout = ref("—");
  const markName = ref("start");
  const measureName = ref("work");
  const measureStart = ref("");
  const measureEnd = ref("");
  // `timings` is not reactive, so the list is re-read after every call that can change it.
  const timingEntries = shallowRef<readonly ITimingEntry[]>([]);
  const markNames = computed(() => [
    ...new Set(
      timingEntries.value.filter((entry) => entry.entryType === "mark").map((entry) => entry.name),
    ),
  ]);

  function refreshTimings() {
    timingEntries.value = timeProvider.value?.timings.entries() ?? [];
    monotonicOriginReadout.value = timeProvider.value
      ? new Date(timeProvider.value.clock.monotonicOrigin).toISOString()
      : "—";
  }

  function describeTimingEntry(entry: ITimingEntry): string {
    return entry.entryType === "mark"
      ? `"${entry.name}" at ${entry.startTime.toFixed(1)}ms`
      : `"${entry.name}" from ${entry.startTime.toFixed(1)}ms, lasting ${entry.duration.toFixed(1)}ms`;
  }

  function readMonotonic() {
    if (!timeProvider.value) return;
    monotonicReadout.value = `${timeProvider.value.clock.monotonicNow().toFixed(1)}ms`;
    pushLog("tick", `monotonicNow() → ${monotonicReadout.value}`);
  }

  function addMark() {
    if (!timeProvider.value) return;
    const name = markName.value.trim() || "mark";
    try {
      const mark = timeProvider.value.timings.mark(name);
      pushLog("tick", `mark("${name}") → ${describeTimingEntry(mark)}`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
    refreshTimings();
  }

  function addMeasure() {
    if (!timeProvider.value) return;
    const name = measureName.value.trim() || "measure";
    const options = {
      ...(measureStart.value && { start: measureStart.value }),
      ...(measureEnd.value && { end: measureEnd.value }),
    };
    try {
      const measure = timeProvider.value.timings.measure(name, options);
      pushLog(
        "tick",
        `measure("${name}", ${JSON.stringify(options)}) → ${describeTimingEntry(measure)}`,
      );
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
    refreshTimings();
  }

  function clearTimings(filter?: ITimingsFilter) {
    if (!timeProvider.value) return;
    timeProvider.value.timings.clear(filter);
    pushLog("tick", `timings.clear(${filter ? JSON.stringify(filter) : ""})`);
    refreshTimings();
  }

  function readLocal() {
    if (!timeProvider.value || !supportsLocalTime.value) return;
    try {
      const v = timeProvider.value.clock.localNow();
      localReadout.value = formatValue(v, true);
      if (selectedStrategy.value === "sequential" && remainingSequential.value !== null) {
        remainingSequential.value = Math.max(0, remainingSequential.value - 1);
      }
      pushLog("tick", `localNow() → ${localReadout.value}`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function moveClock(call: string, move: (clock: PlaygroundProvider["clock"]) => void) {
    if (!timeProvider.value) return;
    try {
      move(timeProvider.value.clock);
      pushLog("tick", call);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function moveBy() {
    const spec = { [advanceUnit.value]: advanceAmount.value };
    const options = { as: moveAs.value };
    moveClock(`moveBy(${JSON.stringify(spec)}, ${JSON.stringify(options)})`, (clock) =>
      clock.moveBy(spec, options),
    );
  }

  function moveToNextTimer() {
    moveClock('moveTo("nextTimer")', (clock) => clock.moveTo("nextTimer"));
  }

  function moveUntilNoTimers() {
    moveClock('moveUntil("noTimers")', (clock) => clock.moveUntil("noTimers"));
  }

  function enqueueMicrotask() {
    if (!timeProvider.value) return;
    const label = microtaskLabel.value.trim() || "microtask";
    try {
      timeProvider.value.scheduler.microtasks.queue(() => {
        pushLog("microtask", `"${label}" ran`);
      });
      pushLog("tick", `Queued microtask "${label}"`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function drainMicrotasks() {
    if (!timeProvider.value) return;
    try {
      timeProvider.value.scheduler.microtasks.drain();
      pushLog("tick", "microtasks.drain()");
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  // A cleared `<input type="number">` leaves v-model.number holding the raw string, so every delay
  // read out of one goes through this rather than straight into the scheduler.
  function positiveNumber(value: number, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function dropTimerRow(id: number) {
    timerRows.value = timerRows.value.filter((r) => r.id !== id);
  }

  function addSchedulerTimer() {
    if (!timeProvider.value) return;
    const kind = timerKind.value;
    const label = timerLabel.value.trim() || "timer";
    const id = nextId++;

    try {
      if (kind === "recurring") {
        addRecurringTimer(id, label);
        return;
      }

      const delay = positiveNumber(timerDelay.value, 0);
      const callback = () => {
        pushLog(kind, `"${label}" fired (${delay}ms)`);
        if (kind === "once") dropTimerRow(id);
      };
      const handle =
        kind === "every"
          ? timeProvider.value.scheduler.timers.every({ milliseconds: delay }, callback)
          : timeProvider.value.scheduler.timers.once({ milliseconds: delay }, callback);

      timerRows.value.push({
        id,
        kind,
        label,
        delayMs: delay,
        handle: markRaw(handle),
      });
      pushLog("tick", `Registered ${kind} "${label}" (${delay}ms)`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function addRecurringTimer(id: number, label: string) {
    if (!timeProvider.value) return;
    const initialDelay = { milliseconds: positiveNumber(recurringInitialDelay.value, 0) };
    const factor = positiveNumber(recurringFactor.value, 1);
    const maxRuns = Math.min(
      RECURRING_MAX_RUNS,
      Math.max(1, Math.round(positiveNumber(recurringMaxRuns.value, 5))),
    );

    let delay = initialDelay;
    const callback = (): { milliseconds: number } | false => {
      const row = timerRows.value.find((r) => r.id === id);
      const runs = (row?.runs ?? 0) + 1;
      if (runs >= maxRuns) {
        if (row) {
          row.runs = runs;
          row.stopped = true;
        }
        pushLog("recurring", `"${label}" run ${runs}/${maxRuns} → returned false, stopped`);
        return false;
      }
      delay.milliseconds = Math.round(delay.milliseconds * factor);
      if (row) {
        row.runs = runs;
        row.nextDelayMs = delay.milliseconds;
      }
      pushLog("recurring", `"${label}" run ${runs}/${maxRuns} → returned ${delay.milliseconds}ms`);
      return delay;
    };

    // Pushed before scheduling: on a manual/sequential clock an initial delay of 0 is already due,
    // so `recurring` runs the callback in-line before it ever returns a handle - the row has to
    // exist by then for that first run to be counted against it.
    timerRows.value.push({
      id,
      kind: "recurring",
      label,
      delayMs: initialDelay.milliseconds,
      runs: 0,
      maxRuns,
      nextDelayMs: initialDelay.milliseconds,
      handle: null,
    });
    const handle = timeProvider.value.scheduler.timers.recurring(callback, initialDelay);
    const row = timerRows.value.find((r) => r.id === id);
    if (row) row.handle = markRaw(handle);
    pushLog(
      "tick",
      `Registered recurring "${label}" (${initialDelay.milliseconds}ms, ×${factor}, ${maxRuns} runs)`,
    );
  }

  function requestFrame() {
    if (!timeProvider.value) return;
    const label = frameLabel.value.trim() || "frame";
    const id = nextId++;
    try {
      const handle = timeProvider.value.scheduler.animation.scheduleFrame(() => {
        pushLog("raf", `"${label}" frame fired`);
        dropTimerRow(id);
      });
      timerRows.value.push({ id, kind: "raf", label, delayMs: 0, handle: markRaw(handle) });
      pushLog("tick", `Requested animation frame "${label}"`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function requestIdle() {
    if (!timeProvider.value) return;
    const label = idleLabel.value.trim() || "idle";
    const id = nextId++;
    try {
      const handle = timeProvider.value.scheduler.idle.request(() => {
        pushLog("idle", `"${label}" idle callback fired`);
        dropTimerRow(id);
      });
      timerRows.value.push({ id, kind: "idle", label, delayMs: 0, handle: markRaw(handle) });
      pushLog("tick", `Requested idle callback "${label}"`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function addCronSchedule() {
    if (!timeProvider.value) return;
    const label = cronLabel.value.trim() || "cron";
    const isBuilder = cronInputMode.value === "builder";
    const expression = isBuilder
      ? cronBuilderExpression.value
      : cronExpression.value.trim() || "* * * * *";
    const id = nextId++;
    try {
      // `schedule` is overloaded on expression vs. spec, so the two modes call it separately
      // rather than handing one union to an overload that takes either.
      const onFire = () => pushLog("cron", `"${label}" fired (${expression})`);
      const cron = timeProvider.value.scheduler.cron;
      const handle = isBuilder
        ? cron.schedule(cronBuilderSpec.value, onFire)
        : cron.schedule(expression, onFire);
      timerRows.value.push({
        id,
        kind: "cron",
        label,
        delayMs: 0,
        expression,
        handle: markRaw(handle),
      });
      pushLog("tick", `Registered cron "${label}" (${expression})`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function removeTimer(row: TimerRow) {
    if (!timeProvider.value) return;
    cancelTimer(row);
    dropTimerRow(row.id);
    pushLog("tick", `Cleared "${row.label}"`);
  }

  function addSequentialTime() {
    const fallback = "2026-01-01T00:00:00.000Z";
    const last = sequentialTimes.value[sequentialTimes.value.length - 1];
    const lastDate = last ? new Date(last) : new Date(NaN);
    const base = Number.isNaN(lastDate.getTime()) ? new Date(fallback) : lastDate;
    sequentialTimes.value.push(new Date(base.getTime() + 1000).toISOString());
  }

  function removeSequentialTime(index: number) {
    sequentialTimes.value.splice(index, 1);
  }

  function addEtaStage() {
    etaStages.value.push({ weight: 1, total: 100 });
  }

  function removeEtaStage(index: number) {
    etaStages.value.splice(index, 1);
  }

  // v-model.number leaves a cleared/non-numeric input as the raw string instead of coercing it.
  function isValidEtaNumber(value: number): boolean {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  // Reset a cleared/invalid field to a sane default rather than letting it reach the addon. A
  // value the user genuinely typed (including 0) is a real number and passes through untouched.
  function coerceEtaNumber(value: number, fallback: number): number {
    return isValidEtaNumber(value) ? value : fallback;
  }

  const canStartEta = computed(() => {
    if (!timeProvider.value || etaTracker.value) return false;
    if (!isValidEtaNumber(etaNotificationInterval.value)) return false;
    if (etaMode.value === "known-total") return isValidEtaNumber(etaTotal.value);
    if (etaMode.value === "duration") return isValidEtaNumber(etaDurationMs.value);
    return etaStages.value.every((s) => isValidEtaNumber(s.weight) && isValidEtaNumber(s.total));
  });

  function startEtaTracker() {
    if (!timeProvider.value || !canStartEta.value) return;
    etaSnapshot.value = null;
    try {
      const builder = timeProvider.value.eta.estimate();
      const notify = (snapshot: { status: string; percentage?: number }) => {
        etaSnapshot.value = snapshot;
        const pct =
          snapshot.percentage !== undefined ? ` · ${snapshot.percentage.toFixed(1)}%` : "";
        pushLog("eta", `[eta] ${snapshot.status}${pct}`);
      };

      if (etaMode.value === "known-total") {
        etaTracker.value = builder
          .withKnownTotal(etaTotal.value)
          .withNotificationInterval(etaNotificationInterval.value)
          .withAlgorithm(etaAlgorithm.value)
          .start(notify);
      } else if (etaMode.value === "stages") {
        etaTracker.value = builder
          .withStages(etaStages.value.map((p) => ({ weight: p.weight, total: p.total })))
          .withNotificationInterval(etaNotificationInterval.value)
          .withAlgorithm(etaAlgorithm.value)
          .start(notify);
      } else {
        etaTracker.value = builder
          .withEstimatedDuration(etaDurationMs.value)
          .withNotificationInterval(etaNotificationInterval.value)
          .start(notify);
      }
      pushLog("tick", `Started .eta.estimate() (${etaMode.value})`);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function etaProgress() {
    if (!etaTracker.value) return;
    etaProgressChunk.value = coerceEtaNumber(etaProgressChunk.value, 10);
    try {
      etaTracker.value.progress(etaProgressChunk.value);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function etaProgressToAction() {
    if (!etaTracker.value) return;
    etaProgressToValue.value = coerceEtaNumber(etaProgressToValue.value, 50);
    try {
      etaTracker.value.progressTo(etaProgressToValue.value);
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function etaNextStage() {
    if (!etaTracker.value) return;
    try {
      etaTracker.value.nextStage();
    } catch (e) {
      pushLog("error", e instanceof Error ? e.message : String(e));
    }
  }

  function etaDoneAction() {
    if (!etaTracker.value) return;
    etaTracker.value.done();
    etaTracker.value = null;
  }

  function etaAbandonAction() {
    if (!etaTracker.value) return;
    etaTracker.value.abandon();
    etaTracker.value = null;
  }

  // Any of these fully redefine what the provider *is* (or its initial state), so rebuilding is the
  // only correct response to a change - equivalent to what the old "Build provider" button did,
  // which is why that button was removed in favor of just reacting to these directly.
  watch(
    [
      selectedPluginKey,
      enabledAddons,
      selectedStrategy,
      timezone,
      useHostTz,
      fixedTime,
      initialTime,
      sequentialTimes,
    ],
    () => buildProvider(),
    { deep: true, immediate: true },
  );

  const codeSnippet = computed(() => {
    const p = selectedPlugin.value;
    const isSystem = selectedStrategy.value === "system";

    const calls = [".for(plugin)"];
    if (supportsLocalTime.value && useHostTz.value) {
      calls.push(`.withHostTimezone() // currently: ${timezone.value.trim()}`);
    } else if (
      supportsLocalTime.value &&
      timezone.value.trim() &&
      timezone.value.trim() !== "Etc/UTC"
    ) {
      calls.push(`.withTimezone("${timezone.value.trim()}")`);
    }
    for (const a of enabledAddonList.value) {
      calls.push(`.use(${a.varName})`);
    }
    if (selectedStrategy.value === "fixed") {
      calls.push(".asFixed()", `.withFixedTime("${fixedTime.value.trim()}")`);
    } else if (selectedStrategy.value === "manual") {
      calls.push(".asManual()", `.withInitialTime("${initialTime.value.trim()}")`);
    } else if (selectedStrategy.value === "sequential") {
      calls.push(".asSequential()");
      for (const t of sequentialTimes.value.map((x) => x.trim()).filter(Boolean)) {
        calls.push(`.withSequentialTime("${t}")`);
      }
    }
    calls.push(".create();");

    const chain = ["createTimeProvider", ...calls].join("\n  ");

    const coreImport = isSystem
      ? `import { createTimeProvider } from "@time-provider/core";`
      : `import { createTimeProvider } from "@time-provider/core/deterministic";`;
    const pluginImport = isSystem
      ? `import { plugin } from "@time-provider/${p.importName}";`
      : `import { plugin } from "@time-provider/${p.importName}/deterministic";`;
    const addonImports = enabledAddonList.value
      .map(
        (a) =>
          `\nimport { addon as ${a.varName} } from "@time-provider/${a.importName}${isSystem ? "" : "/deterministic"}";`,
      )
      .join("");

    return `${coreImport}\n${pluginImport}${addonImports}\nconst timeProvider = ${chain}`;
  });

  const codeHtml = ref("");
  watch(
    codeSnippet,
    async (code) => {
      codeHtml.value = await highlightTs(code);
    },
    { immediate: true },
  );

  const codeCopied = ref(false);
  let codeCopyResetTimer: ReturnType<typeof setTimeout> | undefined;
  async function copyEquivalentCode() {
    await copyToClipboard(codeSnippet.value);
    codeCopied.value = true;
    clearTimeout(codeCopyResetTimer);
    codeCopyResetTimer = setTimeout(() => {
      codeCopied.value = false;
    }, 1500);
  }

  onBeforeUnmount(() => clearAllTimers());

  return {
    CRON_FIELDS,
    RECURRING_MAX_RUNS,
    addCronAtom,
    addCronSchedule,
    addEtaStage,
    addMark,
    addMeasure,
    addSchedulerTimer,
    addSequentialTime,
    addonOptions,
    addonsHint,
    advanceAmount,
    advanceUnit,
    buildError,
    canStartEta,
    clearLog,
    clearTimings,
    codeCopied,
    codeHtml,
    codeSnippet,
    copyEquivalentCode,
    cronBuilder,
    cronBuilderExpression,
    cronBuilderJson,
    cronExpression,
    cronInputMode,
    cronLabel,
    cronRows,
    describeTimer,
    describeTimingEntry,
    drainMicrotasks,
    enabledAddons,
    enqueueMicrotask,
    etaAbandonAction,
    etaAlgorithm,
    etaDoneAction,
    etaDurationMs,
    etaMode,
    etaNextStage,
    etaNotificationInterval,
    etaPercentage,
    etaProgress,
    etaProgressChunk,
    etaProgressToAction,
    etaProgressToValue,
    etaSnapshot,
    etaStages,
    etaStatusLabel,
    etaTotal,
    etaTracker,
    fixedTime,
    frameLabel,
    frameRows,
    hasAnimationFrameAddon,
    hasCronAddon,
    hasEtaAddon,
    hasIdleAddon,
    idleLabel,
    idleRows,
    initialTime,
    localReadout,
    log,
    logEl,
    markName,
    markNames,
    measureEnd,
    measureName,
    measureStart,
    microtaskLabel,
    monotonicOriginReadout,
    monotonicReadout,
    moveAs,
    moveBy,
    moveToNextTimer,
    moveUntilNoTimers,
    openPanes,
    pluginOptions,
    readLocal,
    readMonotonic,
    readUtc,
    recurringFactor,
    recurringInitialDelay,
    recurringMaxRuns,
    remainingSequential,
    removeCronAtom,
    removeEtaStage,
    removeSequentialTime,
    removeTimer,
    requestFrame,
    requestIdle,
    reversedLog,
    schedulerModeLabel,
    schedulerRows,
    selectedPluginKey,
    selectedStrategy,
    sequentialTimes,
    startEtaTracker,
    strategies,
    strategyHint,
    strategyLabel,
    supportsLocalTime,
    timeProvider,
    timerDelay,
    timerKind,
    timerLabel,
    timezone,
    timingEntries,
    togglePane,
    useHostTimezone,
    useHostTz,
    utcReadout,
  };
}

const PLAYGROUND: InjectionKey<ReturnType<typeof createPlayground>> = Symbol("playground");

export function providePlayground(): void {
  provide(PLAYGROUND, createPlayground());
}

export function usePlayground(): ReturnType<typeof createPlayground> {
  return inject(PLAYGROUND)!;
}
