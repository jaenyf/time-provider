<template>
  <div class="pg-cron-builder">
    <div class="pg-cron-preview">
      <div>
        <span class="pg-cron-preview-label">Equivalent expression</span>
        <code>{{ cronBuilderExpression }}</code>
      </div>
      <div>
        <span class="pg-cron-preview-label">ICronSpec</span>
        <pre class="pg-cron-preview-json"><code>{{ cronBuilderJson }}</code></pre>
      </div>
    </div>

    <CronField v-for="field in CRON_FIELDS" :key="field.key" :field="field" />
  </div>
</template>

<script setup lang="ts">
import CronField from "./CronField.vue";
import { usePlayground } from "./state";

const { CRON_FIELDS, cronBuilderExpression, cronBuilderJson } = usePlayground();
</script>
