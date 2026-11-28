<template>
  <template v-if="field.names">
    <select v-model="atom.from" :aria-label="`${field.label} range start`">
      <option v-for="n in field.names" :key="n" :value="n">{{ n }}</option>
    </select>
    <span class="pg-cron-range-sep">–</span>
    <select v-model="atom.to" :aria-label="`${field.label} range end`">
      <option v-for="n in field.names" :key="n" :value="n">{{ n }}</option>
    </select>
  </template>
  <template v-else>
    <input
      type="number"
      v-model="atom.from"
      :min="field.min"
      :max="field.max"
      :aria-label="`${field.label} range start`"
    />
    <span class="pg-cron-range-sep">–</span>
    <input
      type="number"
      v-model="atom.to"
      :min="field.min"
      :max="field.max"
      :aria-label="`${field.label} range end`"
    />
  </template>
  <input
    type="number"
    v-model="atom.step"
    min="1"
    placeholder="step"
    class="pg-cron-step"
    :aria-label="`${field.label} range step`"
  />
</template>

<script setup lang="ts">
import type { CronAtom, CronFieldMeta } from "./state";

defineProps<{ field: CronFieldMeta; atom: CronAtom }>();
</script>
