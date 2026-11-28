<template>
  <div class="pg-timer-row">
    <span><span class="pg-timer-kind">{{ row.kind }}</span>{{ describeTimer(row) }}</span>
    <button class="pg-btn" @click="removeTimer(row)">{{ action }}</button>
  </div>
</template>

<script setup lang="ts">
import { usePlayground, type TimerRow } from "./state";

defineProps<{ row: TimerRow; action: string }>();
const { describeTimer, removeTimer } = usePlayground();
</script>
