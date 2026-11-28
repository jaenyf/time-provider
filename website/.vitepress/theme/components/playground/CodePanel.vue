<template>
  <div class="pg-panel">
    <div class="pg-panel-header">
      <span>Equivalent code</span>
      <button
        class="tp-copy"
        :class="{ copied: codeCopied }"
        :title="codeCopied ? 'Copied' : 'Copy'"
        :aria-label="codeCopied ? 'Copied' : 'Copy code'"
        @click="copyEquivalentCode"
      />
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="pg-code" v-if="codeHtml" v-html="codeHtml"></div>
    <pre v-else class="pg-code"><code>{{ codeSnippet }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { usePlayground } from "./state";

const { codeCopied, codeHtml, codeSnippet, copyEquivalentCode } = usePlayground();
</script>
