<template>
  <div class="pg-panel" :class="{ 'pg-panel-collapsed': !openPanes.timings }">
    <div class="pg-panel-header">
      <button
        type="button"
        class="pg-panel-toggle"
        :aria-expanded="openPanes.timings"
        aria-controls="pg-pane-timings"
        @click="togglePane('timings')"
      >
        <span class="pg-panel-chevron" aria-hidden="true"></span>
        <span>Timings</span>
      </button>
      <span class="pg-badge">{{ strategyLabel }}</span>
    </div>
    <div class="pg-panel-body" id="pg-pane-timings" v-show="openPanes.timings">
      <div class="pg-readout pg-clock-readout">
        <div class="pg-readout-item">
          <div class="pg-label">clock.monotonicNow()</div>
          <div class="pg-value">{{ monotonicReadout }}</div>
          <button
            class="pg-btn"
            style="margin-top: 8px"
            :disabled="!timeProvider"
            @click="readMonotonic"
          >
            Read monotonicNow()
          </button>
        </div>
        <div class="pg-readout-item">
          <div class="pg-label">clock.monotonicOrigin</div>
          <div class="pg-value">{{ monotonicOriginReadout }}</div>
        </div>
      </div>

      <div class="pg-timer-form">
        <label class="pg-input-label">
          <span>mark name</span>
          <input type="text" v-model="markName" placeholder="start" style="width: 110px" />
        </label>
        <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="addMark">
          timings.mark
        </button>
      </div>
      <div class="pg-timer-form">
        <label class="pg-input-label">
          <span>measure name</span>
          <input type="text" v-model="measureName" placeholder="work" style="width: 110px" />
        </label>
        <label class="pg-input-label">
          <span>start mark</span>
          <select v-model="measureStart">
            <option value="">origin</option>
            <option v-for="name in markNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label class="pg-input-label">
          <span>end mark</span>
          <select v-model="measureEnd">
            <option value="">now</option>
            <option v-for="name in markNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="addMeasure">
          timings.measure
        </button>
        <button
          class="pg-btn"
          :disabled="!timeProvider || timingEntries.length === 0"
          @click="clearTimings()"
        >
          timings.clear
        </button>
      </div>
      <div class="pg-timer-list">
        <div
          class="pg-timer-row"
          v-for="entry in timingEntries"
          :key="`${entry.entryType}:${entry.name}:${entry.startTime}`"
        >
          <span
            ><span class="pg-timer-kind">{{ entry.entryType }}</span
            >{{ describeTimingEntry(entry) }}</span
          >
          <button class="pg-btn" @click="clearTimings({ name: entry.name, kind: entry.entryType })">
            Clear
          </button>
        </div>
      </div>
      <p class="pg-note">
        Marks and measures are points on <code>clock.monotonicNow()</code>, in milliseconds since
        <code>clock.monotonicOrigin</code>. On <strong>system</strong>, they go to the host's own
        <code>performance</code> timeline, shared by every system provider in the page, so they
        outlive a rebuild. On
        <strong>fixed</strong>/<strong>manual</strong>/<strong>sequential</strong>, the provider
        keeps its own list, and the monotonic clock follows the simulated one: move a manual clock
        between two marks and the measure shows the simulated time.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const {
  addMark,
  addMeasure,
  clearTimings,
  describeTimingEntry,
  markName,
  markNames,
  measureEnd,
  measureName,
  measureStart,
  monotonicOriginReadout,
  monotonicReadout,
  openPanes,
  readMonotonic,
  strategyLabel,
  timeProvider,
  timingEntries,
  togglePane,
} = usePlayground();
</script>
