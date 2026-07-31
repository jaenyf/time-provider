<template>
  <div class="pg-root">
    <aside class="pg-config">
      <div class="pg-field">
        <label for="pg-plugin">Plugin</label>
        <select id="pg-plugin" v-model="selectedPluginKey">
          <option v-for="p in pluginOptions" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
        <span class="pg-hint">{{
          supportsLocalTime ? "Supports real local time" : "UTC-only adapter"
        }}</span>
      </div>

      <div class="pg-field">
        <label>Addons</label>
        <label class="pg-checkbox" v-for="a in addonOptions" :key="a.key">
          <input type="checkbox" v-model="enabledAddons" :value="a.key" />
          {{ a.label }}
        </label>
        <span class="pg-hint">{{
          hasAnimationFrameAddon
            ? "requestAnimationFrame is available in the Scheduler panel"
            : "Adds .animation to the built provider"
        }}</span>
      </div>

      <div class="pg-field">
        <label for="pg-strategy">Clock strategy</label>
        <select id="pg-strategy" v-model="selectedStrategy">
          <option v-for="s in strategies" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
        <span class="pg-hint">{{ strategyHint }}</span>
      </div>

      <div class="pg-field" v-if="supportsLocalTime">
        <label for="pg-tz">Local timezone</label>
        <input
          id="pg-tz"
          type="text"
          v-model="timezone"
          list="pg-tz-options"
          placeholder="Etc/UTC"
          @input="useHostTz = false"
        />
        <datalist id="pg-tz-options">
          <option value="Etc/UTC" />
          <option value="America/New_York" />
          <option value="Europe/Paris" />
          <option value="Asia/Tokyo" />
          <option value="Australia/Sydney" />
        </datalist>
        <button class="pg-btn" style="align-self: flex-end" @click="useHostTimezone">
          Use host timezone
        </button>
      </div>

      <div class="pg-field" v-if="selectedStrategy === 'fixed'">
        <label for="pg-fixed">Fixed time (ISO 8601)</label>
        <input id="pg-fixed" type="text" v-model="fixedTime" />
      </div>

      <div class="pg-field" v-if="selectedStrategy === 'manual'">
        <label for="pg-initial">Initial time (ISO 8601)</label>
        <input id="pg-initial" type="text" v-model="initialTime" />
      </div>

      <div class="pg-field" v-if="selectedStrategy === 'sequential'">
        <label>Sequential instants (ISO 8601)</label>
        <div class="pg-seq-list">
          <div class="pg-seq-row" v-for="(_t, i) in sequentialTimes" :key="i">
            <input type="text" v-model="sequentialTimes[i]" />
            <button class="pg-btn" title="Remove" @click="removeSequentialTime(i)">×</button>
          </div>
        </div>
        <button class="pg-btn" @click="addSequentialTime">+ Add instant</button>
      </div>

      <p v-if="buildError" class="pg-note" style="color: var(--vp-c-danger-1, #e5484d)">
        {{ buildError }}
      </p>

      <div class="pg-panel">
        <div class="pg-panel-header">
          <span>Equivalent code</span>
          <button
            class="tp-copy"
            :class="{ copied: codeCopied }"
            :title="codeCopied ? 'Copied' : 'Copy'"
            :aria-label="codeCopied ? 'Copied' : 'Copy code'"
            @click="copyEquivalentCode"
          />
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="pg-code" v-if="codeHtml" v-html="codeHtml"></div>
        <pre v-else class="pg-code"><code>{{ codeSnippet }}</code></pre>
      </div>
    </aside>

    <main class="pg-main">
      <div class="pg-readout">
        <div class="pg-readout-item">
          <div class="pg-label">clock.utcNow()</div>
          <div class="pg-value">{{ utcReadout }}</div>
          <button class="pg-btn" style="margin-top: 8px" :disabled="!timeProvider" @click="readUtc">
            Read utcNow()
          </button>
        </div>
        <div class="pg-readout-item">
          <div class="pg-label">clock.localNow()</div>
          <div class="pg-value">
            {{ supportsLocalTime ? localReadout : "— (UTC-only adapter)" }}
          </div>
          <button
            class="pg-btn"
            style="margin-top: 8px"
            :disabled="!timeProvider || !supportsLocalTime"
            @click="readLocal"
          >
            Read localNow()
          </button>
        </div>
        <div class="pg-readout-item" v-if="selectedStrategy === 'sequential'">
          <div class="pg-label">Remaining instants</div>
          <div class="pg-value">{{ remainingSequential }}</div>
        </div>
        <div class="pg-readout-item" v-if="selectedStrategy === 'manual'">
          <div class="pg-label">clock.advance(...)</div>
          <div class="pg-advance-row">
            <input type="number" v-model.number="advanceAmount" />
            <select v-model="advanceUnit">
              <option value="milliseconds">ms</option>
              <option value="seconds">seconds</option>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
              <option value="months">months</option>
              <option value="years">years</option>
            </select>
            <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="advance">
              Advance
            </button>
          </div>
        </div>
      </div>

      <div class="pg-panel">
        <div class="pg-panel-header">
          <span>Scheduler</span>
          <span class="pg-badge">{{ schedulerModeLabel }}</span>
        </div>
        <div class="pg-timer-form">
          <input type="text" v-model="timerLabel" placeholder="label" style="width: 110px" />
          <select v-model="timerKind">
            <option value="interval">Interval</option>
            <option value="timeout">Timeout</option>
            <option v-if="hasAnimationFrameAddon" value="raf">Frame</option>
          </select>
          <input
            v-if="timerKind !== 'raf'"
            type="number"
            v-model.number="timerDelay"
            style="width: 90px"
            placeholder="delay ms"
          />
          <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="addTimer">
            {{ timerKind === "raf" ? "Request frame" : "Add timer" }}
          </button>
        </div>
        <div class="pg-timer-list">
          <div class="pg-timer-row" v-for="row in timerRows" :key="row.id">
            <span v-if="row.kind === 'raf'"
              ><span class="pg-timer-kind">raf</span>"{{ row.label }}" (pending frame)</span
            >
            <span v-else
              ><span class="pg-timer-kind">{{ row.kind }}</span
              >"{{ row.label }}" every {{ row.delayMs }}ms</span
            >
            <button class="pg-btn" @click="removeTimer(row)">Clear</button>
          </div>
        </div>
        <p class="pg-note">
          On <strong>system</strong>, timers fire for real, asynchronously. On
          <strong>manual</strong>/<strong>sequential</strong>, they fire synchronously, in-line, the
          moment <code>advance()</code>/<code>utcNow()</code>/<code>localNow()</code> makes them
          due. On <strong>fixed</strong>, they never fire.
          <template v-if="hasAnimationFrameAddon">
            <code>requestAnimationFrame</code> fires the same way, once, whenever a frame becomes
            due for the current strategy.
          </template>
        </p>
      </div>

      <div class="pg-panel">
        <div class="pg-panel-header">
          <span>Event log</span>
          <button class="pg-btn" @click="clearLog">Clear</button>
        </div>
        <div class="pg-log" ref="logEl">
          <div
            class="pg-log-row"
            :class="`pg-log-${row.kind}`"
            v-for="row in reversedLog"
            :key="row.id"
          >
            <span class="pg-log-time">{{ row.time }}</span>
            <span class="pg-log-msg">{{ row.msg }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";
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
import { highlightTs } from "../shiki";

type Strategy = "system" | "fixed" | "manual" | "sequential";
type TimerKind = "timeout" | "interval" | "raf";

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

interface AddonOption {
  key: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  systemAddon: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deterministicAddon: any;
  importName: string;
}

const addonOptions: AddonOption[] = [
  {
    key: "animation-frame",
    label: "Animation Frame API",
    systemAddon: animationFrameAddon,
    deterministicAddon: animationFrameDeterministicAddon,
    importName: "addon-animation-frame",
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
  manual: "Advances only via advance(). Timers fire in-line when due.",
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

const timerLabel = ref("Tick");
const timerKind = ref<TimerKind>("interval");
const timerDelay = ref(1000);

const selectedPlugin = computed(
  () => pluginOptions.find((p) => p.key === selectedPluginKey.value) ?? pluginOptions[0],
);
const supportsLocalTime = computed(() =>
  Boolean(selectedPlugin.value.systemPlugin.supportsLocalTime),
);
const hasAnimationFrameAddon = computed(() => enabledAddons.value.includes("animation-frame"));
const strategyHint = computed(() => strategyHints[selectedStrategy.value]);
const schedulerModeLabel = computed(() => schedulerModeLabels[selectedStrategy.value]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const timeProvider = shallowRef<any>(null);
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

interface TimerRow {
  id: number;
  kind: TimerKind;
  label: string;
  delayMs: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: any;
}
const timerRows = ref<TimerRow[]>([]);

function clearAllTimers() {
  if (!timeProvider.value) return;
  for (const row of timerRows.value) {
    if (row.kind === "interval") timeProvider.value.scheduler.clearInterval(row.handle);
    else if (row.kind === "raf") timeProvider.value.animation.cancelAnimationFrame(row.handle);
    else timeProvider.value.scheduler.clearTimeout(row.handle);
  }
  timerRows.value = [];
}

function formatValue(value: unknown, isLocal: boolean): string {
  if (value === null || value === undefined) return String(value);
  const v = value as Record<string, unknown>;
  if (isLocal && typeof v.format === "function") return (v.format as () => string)();
  if (typeof v.toISO === "function") return (v.toISO as () => string)();
  if (typeof v.toISOString === "function") return (v.toISOString as () => string)();
  if (typeof v.toString === "function") return String(v);
  return String(value);
}

function useHostTimezone() {
  try {
    timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    useHostTz.value = true;
  } catch {
    /* Intl unavailable - leave timezone as-is */
  }
}

function buildProvider() {
  clearAllTimers();
  buildError.value = "";
  utcReadout.value = "—";
  localReadout.value = "—";
  remainingSequential.value = null;
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

    if (supportsLocalTime.value) {
      builder = useHostTz.value
        ? builder.withHostTimezone()
        : builder.withTimezone(timezone.value.trim() || "Etc/UTC");
    }

    for (const addon of addonOptions) {
      if (enabledAddons.value.includes(addon.key)) {
        builder = builder.use(isSystem ? addon.systemAddon : addon.deterministicAddon);
      }
    }

    if (selectedStrategy.value === "fixed") {
      builder = builder.asFixed().withFixedTime(fixedTime.value.trim());
    } else if (selectedStrategy.value === "manual") {
      builder = builder.asManual().withInitialTime(initialTime.value.trim());
    } else if (selectedStrategy.value === "sequential") {
      builder = builder.asSequential();
      const times = sequentialTimes.value.map((t) => t.trim()).filter(Boolean);
      for (const t of times) builder = builder.withSequentialTime(t);
      remainingSequential.value = times.length;
    }

    timeProvider.value = builder.create();
    const addonSuffix = hasAnimationFrameAddon.value ? " + animation-frame addon" : "";
    pushLog(
      "tick",
      `Built ${selectedPlugin.value.label} · ${selectedStrategy.value} provider${addonSuffix}`,
    );
  } catch (e) {
    buildError.value = e instanceof Error ? e.message : String(e);
    timeProvider.value = null;
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

function advance() {
  if (!timeProvider.value) return;
  try {
    const options = { [advanceUnit.value]: advanceAmount.value };
    timeProvider.value.clock.advance(options);
    pushLog("tick", `advance(${JSON.stringify(options)})`);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function addTimer() {
  if (!timeProvider.value) return;
  const kind = timerKind.value;
  const label = timerLabel.value.trim() || (kind === "raf" ? "frame" : "timer");
  const delay = kind === "raf" ? 0 : Math.max(0, Number(timerDelay.value) || 0);
  const id = nextId++;

  const callback = () => {
    pushLog(kind, kind === "raf" ? `"${label}" frame fired` : `"${label}" fired (${delay}ms)`);
    if (kind === "timeout" || kind === "raf") {
      timerRows.value = timerRows.value.filter((r) => r.id !== id);
    }
  };

  const handle =
    kind === "interval"
      ? timeProvider.value.scheduler.setInterval(callback, delay)
      : kind === "raf"
        ? timeProvider.value.animation.requestAnimationFrame(callback)
        : timeProvider.value.scheduler.setTimeout(callback, delay);

  timerRows.value.push({ id, kind, label, delayMs: delay, handle });
  pushLog(
    "tick",
    kind === "raf"
      ? `Requested animation frame "${label}"`
      : `Registered ${kind} "${label}" (${delay}ms)`,
  );
}

function removeTimer(row: TimerRow) {
  if (!timeProvider.value) return;
  if (row.kind === "interval") timeProvider.value.scheduler.clearInterval(row.handle);
  else if (row.kind === "raf") timeProvider.value.animation.cancelAnimationFrame(row.handle);
  else timeProvider.value.scheduler.clearTimeout(row.handle);
  timerRows.value = timerRows.value.filter((r) => r.id !== row.id);
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

watch(enabledAddons, () => {
  if (!hasAnimationFrameAddon.value && timerKind.value === "raf") {
    timerKind.value = "interval";
  }
});

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
  if (hasAnimationFrameAddon.value) {
    calls.push(".use(addon)");
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
  const addonImports = addonOptions
    .filter((a) => enabledAddons.value.includes(a.key))
    .map(
      (a) =>
        `\nimport { addon } from "@time-provider/${a.importName}${isSystem ? "" : "/deterministic"}";`,
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
  try {
    await navigator.clipboard.writeText(codeSnippet.value);
  } catch {
    // Clipboard API unavailable (e.g. an insecure context) - fall back to the legacy copy command.
    const textarea = document.createElement("textarea");
    textarea.value = codeSnippet.value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
  codeCopied.value = true;
  clearTimeout(codeCopyResetTimer);
  codeCopyResetTimer = setTimeout(() => {
    codeCopied.value = false;
  }, 1500);
}

onBeforeUnmount(() => clearAllTimers());
</script>
