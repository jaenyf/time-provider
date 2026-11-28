<template>
  <div class="pg-timer-form">
    <label class="pg-input-label">
      <span>chunk to add</span>
      <input type="number" v-model.number="etaProgressChunk" style="width: 90px" />
    </label>
    <button class="pg-btn" @click="etaProgress">progress(chunk)</button>
    <label class="pg-input-label">
      <span>total completed so far</span>
      <input type="number" v-model.number="etaProgressToValue" style="width: 90px" />
    </label>
    <button class="pg-btn" @click="etaProgressToAction">progressTo(done)</button>
    <button
      class="pg-btn"
      v-if="etaMode === 'stages'"
      :disabled="etaSnapshot?.currentStageIndex >= etaStages.length - 1"
      @click="etaNextStage"
    >
      nextStage()
    </button>
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const {
  etaMode,
  etaNextStage,
  etaProgress,
  etaProgressChunk,
  etaProgressToAction,
  etaProgressToValue,
  etaSnapshot,
  etaStages,
} = usePlayground();
</script>
