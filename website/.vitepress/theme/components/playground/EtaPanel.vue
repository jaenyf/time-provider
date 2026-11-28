<template>
  <div class="pg-panel" v-if="hasEtaAddon" :class="{ 'pg-panel-collapsed': !openPanes.eta }">
    <div class="pg-panel-header">
      <button
        type="button"
        class="pg-panel-toggle"
        :aria-expanded="openPanes.eta"
        aria-controls="pg-pane-eta"
        @click="togglePane('eta')"
      >
        <span class="pg-panel-chevron" aria-hidden="true"></span>
        <span>ETA</span>
      </button>
      <span class="pg-badge">{{ etaStatusLabel }}</span>
    </div>
    <div class="pg-panel-body" id="pg-pane-eta" v-show="openPanes.eta">
      <EtaControls />

      <EtaOptions />

      <EtaStages v-if="etaMode === 'stages'" />

      <EtaProgress v-if="etaTracker && etaMode !== 'duration'" />

      <EtaReadout v-if="etaSnapshot" />

      <p class="pg-note">
        <code>progress()</code>/<code>progressTo()</code> never notify by themselves - snapshots are
        delivered strictly on the notification interval above, plus one final notification after
        <code>done()</code>/<code>abandon()</code>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import EtaControls from "./EtaControls.vue";
import EtaOptions from "./EtaOptions.vue";
import EtaStages from "./EtaStages.vue";
import EtaProgress from "./EtaProgress.vue";
import EtaReadout from "./EtaReadout.vue";
import { usePlayground } from "./state";

const { etaMode, etaSnapshot, etaStatusLabel, etaTracker, hasEtaAddon, openPanes, togglePane } =
  usePlayground();
</script>
