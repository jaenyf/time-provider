<template>
  <div class="pg-field">
    <label for="pg-plugin">Plugin</label>
    <select id="pg-plugin" v-model="selectedPluginKey">
      <option v-for="p in pluginOptions" :key="p.key" :value="p.key">{{ p.label }}</option>
    </select>
    <span class="pg-hint">{{
      supportsLocalTime ? "Supports real local time" : "UTC-only adapter"
    }}</span>
  </div>

  <div class="pg-field" role="group" aria-labelledby="pg-addons-label">
    <label id="pg-addons-label">Addons</label>
    <label class="pg-checkbox" v-for="a in addonOptions" :key="a.key">
      <input type="checkbox" v-model="enabledAddons" :value="a.key" />
      {{ a.label }}
    </label>
    <span class="pg-hint">{{ addonsHint }}</span>
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

  <div
    class="pg-field"
    v-if="selectedStrategy === 'sequential'"
    role="group"
    aria-labelledby="pg-sequential-label"
  >
    <label id="pg-sequential-label">Sequential instants (ISO 8601)</label>
    <div class="pg-seq-list">
      <div class="pg-seq-row" v-for="(_t, i) in sequentialTimes" :key="i">
        <input type="text" v-model="sequentialTimes[i]" :aria-label="`Instant ${i + 1}`" />
        <button
          class="pg-btn"
          :title="`Remove instant ${i + 1}`"
          :aria-label="`Remove instant ${i + 1}`"
          @click="removeSequentialTime(i)"
        >
          ×
        </button>
      </div>
    </div>
    <button class="pg-btn" @click="addSequentialTime">+ Add instant</button>
  </div>

  <p v-if="buildError" class="pg-note" style="color: var(--vp-c-danger-1, #e5484d)">
    {{ buildError }}
  </p>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const {
  addSequentialTime,
  addonOptions,
  addonsHint,
  buildError,
  enabledAddons,
  fixedTime,
  initialTime,
  pluginOptions,
  removeSequentialTime,
  selectedPluginKey,
  selectedStrategy,
  sequentialTimes,
  strategies,
  strategyHint,
  supportsLocalTime,
  timezone,
  useHostTimezone,
  useHostTz,
} = usePlayground();
</script>
