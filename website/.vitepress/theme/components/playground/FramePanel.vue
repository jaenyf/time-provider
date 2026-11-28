<template>
  <div
    class="pg-panel"
    v-if="hasAnimationFrameAddon"
    :class="{ 'pg-panel-collapsed': !openPanes.frame }"
  >
    <div class="pg-panel-header">
      <button
        type="button"
        class="pg-panel-toggle"
        :aria-expanded="openPanes.frame"
        aria-controls="pg-pane-frame"
        @click="togglePane('frame')"
      >
        <span class="pg-panel-chevron" aria-hidden="true"></span>
        <span>Animation Frame</span>
      </button>
      <span class="pg-badge">{{ schedulerModeLabel }}</span>
    </div>
    <div class="pg-panel-body" id="pg-pane-frame" v-show="openPanes.frame">
      <div class="pg-timer-form">
        <label class="pg-input-label">
          <span>label</span>
          <input type="text" v-model="frameLabel" placeholder="Frame" style="width: 110px" />
        </label>
        <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="requestFrame">
          Request frame
        </button>
      </div>
      <div class="pg-timer-list pg-timer-list-frames">
        <TimerRowItem v-for="row in frameRows" :key="row.id" :row="row" action="Cancel" />
      </div>
      <p class="pg-note">
        <code>scheduleFrame</code> fires once, whenever a frame becomes due for the current strategy
        — asynchronously on <strong>system</strong>, in-line on
        <strong>manual</strong>/<strong>sequential</strong>, never on <strong>fixed</strong>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import TimerRowItem from "./TimerRowItem.vue";
import { usePlayground } from "./state";

const {
  frameLabel,
  frameRows,
  hasAnimationFrameAddon,
  openPanes,
  requestFrame,
  schedulerModeLabel,
  timeProvider,
  togglePane,
} = usePlayground();
</script>
