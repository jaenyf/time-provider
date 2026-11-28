<template>
  <div class="pg-panel" v-if="hasCronAddon" :class="{ 'pg-panel-collapsed': !openPanes.cron }">
    <div class="pg-panel-header">
      <button
        type="button"
        class="pg-panel-toggle"
        :aria-expanded="openPanes.cron"
        aria-controls="pg-pane-cron"
        @click="togglePane('cron')"
      >
        <span class="pg-panel-chevron" aria-hidden="true"></span>
        <span>Cron</span>
      </button>
      <span class="pg-badge">{{ schedulerModeLabel }}</span>
    </div>
    <div class="pg-panel-body" id="pg-pane-cron" v-show="openPanes.cron">
      <div class="pg-timer-form">
        <label class="pg-input-label">
          <span>label</span>
          <input type="text" v-model="cronLabel" placeholder="Nightly" style="width: 110px" />
        </label>

        <div class="pg-input-label">
          <span id="pg-cron-mode-label">input mode</span>
          <div class="pg-seg" role="group" aria-labelledby="pg-cron-mode-label">
            <button
              type="button"
              class="pg-seg-btn"
              :class="{ active: cronInputMode === 'expression' }"
              :aria-pressed="cronInputMode === 'expression'"
              @click="cronInputMode = 'expression'"
            >
              Expression
            </button>
            <button
              type="button"
              class="pg-seg-btn"
              :class="{ active: cronInputMode === 'builder' }"
              :aria-pressed="cronInputMode === 'builder'"
              @click="cronInputMode = 'builder'"
            >
              Builder
            </button>
          </div>
        </div>

        <label class="pg-input-label" v-if="cronInputMode === 'expression'">
          <span>expression</span>
          <input
            type="text"
            v-model="cronExpression"
            style="width: 140px"
            placeholder="* * * * *"
          />
        </label>

        <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="addCronSchedule">
          Add schedule
        </button>
      </div>
      <CronBuilder v-if="cronInputMode === 'builder'" />
      <div class="pg-timer-list pg-timer-list-cron">
        <TimerRowItem v-for="row in cronRows" :key="row.id" :row="row" action="Unschedule" />
      </div>
      <p class="pg-note">
        A cron schedule repeats on the next minute the expression matches, in the runtime's local
        timezone (<code>Etc/UTC</code> for a UTC-only plugin), and follows the same firing model as
        the timers above — asynchronously on <strong>system</strong>, in-line on
        <strong>manual</strong>/<strong>sequential</strong>, never on <strong>fixed</strong>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import TimerRowItem from "./TimerRowItem.vue";
import CronBuilder from "./CronBuilder.vue";
import { usePlayground } from "./state";

const {
  addCronSchedule,
  cronExpression,
  cronInputMode,
  cronLabel,
  cronRows,
  hasCronAddon,
  openPanes,
  schedulerModeLabel,
  timeProvider,
  togglePane,
} = usePlayground();
</script>
