<template>
  <div class="pg-panel" :class="{ 'pg-panel-collapsed': !openPanes.log }">
    <div class="pg-panel-header">
      <button
        type="button"
        class="pg-panel-toggle"
        :aria-expanded="openPanes.log"
        aria-controls="pg-pane-log"
        @click="togglePane('log')"
      >
        <span class="pg-panel-chevron" aria-hidden="true"></span>
        <span>Event log</span>
      </button>
      <button class="pg-btn" @click="clearLog">Clear</button>
    </div>
    <div class="pg-panel-body" id="pg-pane-log" v-show="openPanes.log">
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
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const { clearLog, log, logEl, openPanes, reversedLog, togglePane } = usePlayground();
</script>
