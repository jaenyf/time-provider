<template>
  <div class="pg-panel" v-if="hasIdleAddon" :class="{ 'pg-panel-collapsed': !openPanes.idle }">
    <div class="pg-panel-header">
      <button
        type="button"
        class="pg-panel-toggle"
        :aria-expanded="openPanes.idle"
        aria-controls="pg-pane-idle"
        @click="togglePane('idle')"
      >
        <span class="pg-panel-chevron" aria-hidden="true"></span>
        <span>Idle Callback</span>
      </button>
      <span class="pg-badge">{{ schedulerModeLabel }}</span>
    </div>
    <div class="pg-panel-body" id="pg-pane-idle" v-show="openPanes.idle">
      <div class="pg-timer-form">
        <label class="pg-input-label">
          <span>label</span>
          <input type="text" v-model="idleLabel" placeholder="Idle" style="width: 110px" />
        </label>
        <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="requestIdle">
          Request idle callback
        </button>
      </div>
      <div class="pg-timer-list pg-timer-list-idle">
        <TimerRowItem v-for="row in idleRows" :key="row.id" :row="row" action="Cancel" />
      </div>
      <p class="pg-note">
        <code>idle.request</code> fires once, when the host considers itself idle - asynchronously
        on <strong>system</strong>, once this runtime's own clock has moved forward by the simulated
        idle delay (1ms by default) on
        <strong>fixed</strong>/<strong>manual</strong>/<strong>sequential</strong>. Cancel it, same
        as every scheduling API here, via <code>dispose()</code> on the returned handle.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import TimerRowItem from "./TimerRowItem.vue";
import { usePlayground } from "./state";

const {
  hasIdleAddon,
  idleLabel,
  idleRows,
  openPanes,
  requestIdle,
  schedulerModeLabel,
  timeProvider,
  togglePane,
} = usePlayground();
</script>
