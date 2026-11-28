<template>
  <div class="pg-root">
    <aside class="pg-config">
      <ConfigPanel />
      <CodePanel />
    </aside>

    <main class="pg-main">
      <ClockPanel />
      <SchedulerPanel />
      <TimingsPanel />
      <FramePanel />
      <CronPanel />
      <EtaPanel />
      <IdlePanel />
      <LogPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import { providePlayground } from "./playground/state";
import ConfigPanel from "./playground/ConfigPanel.vue";
import CodePanel from "./playground/CodePanel.vue";
import ClockPanel from "./playground/ClockPanel.vue";
import SchedulerPanel from "./playground/SchedulerPanel.vue";
import TimingsPanel from "./playground/TimingsPanel.vue";
import FramePanel from "./playground/FramePanel.vue";
import CronPanel from "./playground/CronPanel.vue";
import EtaPanel from "./playground/EtaPanel.vue";
import IdlePanel from "./playground/IdlePanel.vue";
import LogPanel from "./playground/LogPanel.vue";

providePlayground();
</script>
