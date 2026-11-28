<template>
  <div class="pg-readout pg-eta-readout">
    <div class="pg-readout-item" v-if="etaMode !== 'duration'">
      <div class="pg-label">
        {{ etaMode === "stages" ? "stagePercentage" : "percentage" }}
      </div>
      <div class="pg-value">{{ etaPercentage.toFixed(1) }}%</div>
    </div>
    <div class="pg-readout-item" v-if="etaMode === 'stages'">
      <div class="pg-label">stage</div>
      <div class="pg-value">
        {{ etaSnapshot.currentStageIndex + 1 }} / {{ etaSnapshot.stageCount }}
      </div>
    </div>
    <div class="pg-readout-item" v-if="etaMode !== 'duration'">
      <div class="pg-label">rate</div>
      <div class="pg-value">
        {{ etaSnapshot.rate !== undefined ? etaSnapshot.rate.toFixed(6) : "—" }}
      </div>
    </div>
    <div class="pg-readout-item">
      <div class="pg-label">eta</div>
      <div class="pg-value">
        {{ etaSnapshot.eta !== undefined ? new Date(etaSnapshot.eta).toISOString() : "—" }}
      </div>
    </div>
    <div class="pg-readout-item">
      <div class="pg-label">remainingMilliseconds</div>
      <div class="pg-value">
        {{
          etaSnapshot.remainingMilliseconds !== undefined ? etaSnapshot.remainingMilliseconds : "—"
        }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const { etaMode, etaPercentage, etaSnapshot } = usePlayground();
</script>
