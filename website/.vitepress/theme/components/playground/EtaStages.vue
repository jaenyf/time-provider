<template>
  <div class="pg-seq-list pg-eta-stages">
    <div class="pg-seq-row pg-eta-stages-header">
      <span class="pg-caption">weight (relative to the other stages)</span>
      <span class="pg-caption">total (this stage's own unit)</span>
      <span class="pg-eta-stages-header-spacer"></span>
    </div>
    <div class="pg-seq-row" v-for="(_p, i) in etaStages" :key="i">
      <input
        type="number"
        v-model.number="etaStages[i].weight"
        placeholder="weight"
        :aria-label="`Stage ${i + 1} weight`"
        :disabled="!!etaTracker"
      />
      <input
        type="number"
        v-model.number="etaStages[i].total"
        placeholder="total"
        :aria-label="`Stage ${i + 1} total`"
        :disabled="!!etaTracker"
      />
      <button
        class="pg-btn"
        :title="`Remove stage ${i + 1}`"
        :aria-label="`Remove stage ${i + 1}`"
        :disabled="!!etaTracker || etaStages.length <= 1"
        @click="removeEtaStage(i)"
      >
        ×
      </button>
    </div>
    <button class="pg-btn" :disabled="!!etaTracker" @click="addEtaStage">+ Add stage</button>
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const { addEtaStage, etaStages, etaTracker, removeEtaStage } = usePlayground();
</script>
