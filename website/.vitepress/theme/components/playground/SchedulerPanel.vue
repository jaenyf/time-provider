<template>
  <div class="pg-panel" :class="{ 'pg-panel-collapsed': !openPanes.scheduler }">
    <div class="pg-panel-header">
      <button
        type="button"
        class="pg-panel-toggle"
        :aria-expanded="openPanes.scheduler"
        aria-controls="pg-pane-scheduler"
        @click="togglePane('scheduler')"
      >
        <span class="pg-panel-chevron" aria-hidden="true"></span>
        <span>Scheduler</span>
      </button>
      <span class="pg-badge">{{ schedulerModeLabel }}</span>
    </div>
    <div class="pg-panel-body" id="pg-pane-scheduler" v-show="openPanes.scheduler">
      <div class="pg-timer-form">
        <label class="pg-input-label">
          <span>label</span>
          <input type="text" v-model="timerLabel" placeholder="Tick" style="width: 110px" />
        </label>

        <label class="pg-input-label">
          <span>method</span>
          <select v-model="timerKind">
            <option value="every">every</option>
            <option value="once">once</option>
            <option value="recurring">recurring</option>
          </select>
        </label>

        <label class="pg-input-label" v-if="timerKind !== 'recurring'">
          <span>delay (ms)</span>
          <input type="number" v-model.number="timerDelay" style="width: 100px" min="0" />
        </label>

        <template v-else>
          <label class="pg-input-label">
            <span>initial delay (ms)</span>
            <input
              type="number"
              v-model.number="recurringInitialDelay"
              style="width: 110px"
              min="0"
            />
          </label>
          <label class="pg-input-label">
            <span>backoff factor</span>
            <input
              type="number"
              v-model.number="recurringFactor"
              style="width: 100px"
              min="0"
              step="0.5"
            />
          </label>
          <label class="pg-input-label">
            <span>stop after (runs)</span>
            <input
              type="number"
              v-model.number="recurringMaxRuns"
              style="width: 110px"
              min="1"
              :max="RECURRING_MAX_RUNS"
            />
          </label>
        </template>

        <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="addSchedulerTimer">
          Add timer
        </button>
      </div>
      <div class="pg-timer-list">
        <TimerRowItem v-for="row in schedulerRows" :key="row.id" :row="row" action="Clear" />
      </div>
      <p class="pg-note">
        On <strong>system</strong>, timers fire for real, asynchronously. On
        <strong>manual</strong>/<strong>sequential</strong>, they fire synchronously, in-line, the
        moment <code>moveBy()</code>/<code>utcNow()</code>/<code>localNow()</code> makes them due.
        On <strong>fixed</strong>, they never fire. <code>recurring</code> re-reads its period from
        what the run itself returns — here, the previous delay times the backoff factor — and
        returns <code>false</code> on the last run to stop.
      </p>

      <div class="pg-timer-form">
        <label class="pg-input-label">
          <span>label</span>
          <input
            type="text"
            v-model="microtaskLabel"
            placeholder="Microtask"
            style="width: 110px"
          />
        </label>
        <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="enqueueMicrotask">
          microtasks.queue
        </button>
        <button
          class="pg-btn"
          v-if="selectedStrategy !== 'system'"
          :disabled="!timeProvider"
          @click="drainMicrotasks"
        >
          microtasks.drain
        </button>
      </div>
      <p class="pg-note">
        On <strong>system</strong>, <code>microtasks.queue</code> hands the callback to the host's
        own microtask queue - it fires asynchronously, sharing one FIFO queue with promise
        continuations. On
        <strong>fixed</strong>/<strong>manual</strong>/<strong>sequential</strong>, it goes on this
        runtime's own queue instead, and is drained automatically after each due callback and before
        any scheduling call or clock read - <code>microtasks.drain</code>
        runs that checkpoint on demand, which is the only way to observe one queued directly from
        here rather than from inside a due callback.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import TimerRowItem from "./TimerRowItem.vue";
import { usePlayground } from "./state";

const {
  RECURRING_MAX_RUNS,
  addSchedulerTimer,
  drainMicrotasks,
  enqueueMicrotask,
  microtaskLabel,
  openPanes,
  recurringFactor,
  recurringInitialDelay,
  recurringMaxRuns,
  schedulerModeLabel,
  schedulerRows,
  selectedStrategy,
  timeProvider,
  timerDelay,
  timerKind,
  timerLabel,
  togglePane,
} = usePlayground();
</script>
