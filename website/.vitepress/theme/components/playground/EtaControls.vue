<template>
  <div class="pg-timer-form">
    <div class="pg-input-label">
      <span id="pg-eta-controls-label">controls</span>
      <div class="pg-eta-actions" role="group" aria-labelledby="pg-eta-controls-label">
        <button class="pg-btn pg-btn-brand" :disabled="!canStartEta" @click="startEtaTracker">
          Start
        </button>
        <button class="pg-btn" :disabled="!etaTracker" @click="etaDoneAction">done()</button>
        <button class="pg-btn" :disabled="!etaTracker" @click="etaAbandonAction">abandon()</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const { canStartEta, etaAbandonAction, etaDoneAction, etaTracker, startEtaTracker } =
  usePlayground();
</script>
