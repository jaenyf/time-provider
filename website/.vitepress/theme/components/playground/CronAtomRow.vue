<template>
  <div class="pg-cron-atom-row">
    <select v-model="atom.mode" class="pg-cron-atom-mode" :aria-label="`${field.label} entry mode`">
      <option value="value">Value</option>
      <option value="range">Range</option>
    </select>

    <template v-if="atom.mode === 'value'">
      <select v-if="field.names" v-model="atom.value" :aria-label="field.label">
        <option v-for="n in field.names" :key="n" :value="n">{{ n }}</option>
      </select>
      <input
        v-else
        type="number"
        v-model="atom.value"
        :min="field.min"
        :max="field.max"
        :aria-label="field.label"
      />
    </template>

    <CronAtomRange v-else :field="field" :atom="atom" />

    <button
      class="pg-btn"
      :title="`Remove ${field.label} entry`"
      :aria-label="`Remove ${field.label} entry`"
      @click="removeCronAtom(field, atom.id)"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
import CronAtomRange from "./CronAtomRange.vue";
import { usePlayground, type CronAtom, type CronFieldMeta } from "./state";

defineProps<{ field: CronFieldMeta; atom: CronAtom }>();
const { removeCronAtom } = usePlayground();
</script>
