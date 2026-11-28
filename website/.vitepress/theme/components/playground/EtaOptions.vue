<template>
  <div class="pg-timer-form">
    <label class="pg-input-label">
      <span>mode</span>
      <select v-model="etaMode" :disabled="!!etaTracker">
        <option value="known-total">Known total</option>
        <option value="stages">Stages</option>
        <option value="duration">Estimated duration</option>
      </select>
    </label>

    <label class="pg-input-label" v-if="etaMode === 'known-total'">
      <span>total</span>
      <input
        type="number"
        v-model.number="etaTotal"
        style="width: 90px"
        placeholder="e.g. 1000000"
        :disabled="!!etaTracker"
      />
    </label>

    <label class="pg-input-label" v-if="etaMode === 'duration'">
      <span>expected duration</span>
      <input
        type="number"
        v-model.number="etaDurationMs"
        style="width: 110px"
        placeholder="ms"
        :disabled="!!etaTracker"
      />
    </label>

    <label class="pg-input-label" v-if="etaMode !== 'duration'">
      <span>algorithm</span>
      <select v-model="etaAlgorithm" :disabled="!!etaTracker">
        <option value="complete">Complete</option>
        <option value="windowed">Windowed</option>
        <option value="smoothed">Smoothed</option>
      </select>
    </label>

    <label class="pg-input-label">
      <span>notification interval</span>
      <input
        type="number"
        v-model.number="etaNotificationInterval"
        style="width: 110px"
        placeholder="ms"
        :disabled="!!etaTracker"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const { etaAlgorithm, etaDurationMs, etaMode, etaNotificationInterval, etaTotal, etaTracker } =
  usePlayground();
</script>
