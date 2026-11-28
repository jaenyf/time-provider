<template>
  <div class="pg-panel" :class="{ 'pg-panel-collapsed': !openPanes.clock }">
    <div class="pg-panel-header">
      <button
        type="button"
        class="pg-panel-toggle"
        :aria-expanded="openPanes.clock"
        aria-controls="pg-pane-clock"
        @click="togglePane('clock')"
      >
        <span class="pg-panel-chevron" aria-hidden="true"></span>
        <span>Clock</span>
      </button>
      <span class="pg-badge">{{ strategyLabel }}</span>
    </div>
    <div class="pg-panel-body" id="pg-pane-clock" v-show="openPanes.clock">
      <div class="pg-readout pg-clock-readout">
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
          <div class="pg-label">clock.moveBy(...)</div>
          <div class="pg-advance-row">
            <label class="pg-input-label">
              <span>amount</span>
              <input type="number" v-model.number="advanceAmount" />
            </label>
            <label class="pg-input-label">
              <span>unit</span>
              <select v-model="advanceUnit">
                <option value="milliseconds">ms</option>
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
                <option value="months">months</option>
                <option value="years">years</option>
              </select>
            </label>
            <label class="pg-input-label">
              <span>as</span>
              <select v-model="moveAs">
                <option value="flow">flow</option>
                <option value="sleep">sleep</option>
                <option value="snap">snap</option>
              </select>
            </label>
            <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="moveBy">
              Move
            </button>
          </div>
          <div class="pg-advance-row">
            <button class="pg-btn" :disabled="!timeProvider" @click="moveToNextTimer">
              moveTo("nextTimer")
            </button>
            <button class="pg-btn" :disabled="!timeProvider" @click="moveUntilNoTimers">
              moveUntil("noTimers")
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const {
  advanceAmount,
  advanceUnit,
  localReadout,
  moveAs,
  moveBy,
  moveToNextTimer,
  moveUntilNoTimers,
  openPanes,
  readLocal,
  readUtc,
  remainingSequential,
  selectedStrategy,
  strategyLabel,
  supportsLocalTime,
  timeProvider,
  togglePane,
  utcReadout,
} = usePlayground();
</script>
