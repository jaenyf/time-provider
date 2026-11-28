<template>
  <div class="pg-cron-field">
    <div class="pg-cron-field-header">
      <span>{{ field.label }}</span>
      <label class="pg-checkbox">
        <input type="checkbox" v-model="cronBuilder[field.key].wildcard" />
        Every value
      </label>
    </div>

    <div v-if="!cronBuilder[field.key].wildcard" class="pg-cron-atom-list">
      <CronAtomRow
        v-for="atom in cronBuilder[field.key].atoms"
        :key="atom.id"
        :field="field"
        :atom="atom"
      />
      <button class="pg-btn" @click="addCronAtom(field)">+ Add {{ field.label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import CronAtomRow from "./CronAtomRow.vue";
import { usePlayground, type CronFieldMeta } from "./state";

defineProps<{ field: CronFieldMeta }>();
const { addCronAtom, cronBuilder } = usePlayground();
</script>
