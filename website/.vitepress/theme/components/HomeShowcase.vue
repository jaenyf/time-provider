<template>
  <section class="tp-showcase">
    <p style="text-align: center; color: var(--vp-c-text-2); margin-bottom: 20px">
      Same <code>ITimeProvider</code>, same call sites. Only the strategy behind
      <code>.create()</code> changes between production and tests.
    </p>
    <div class="tp-showcase-grid">
      <div class="tp-panel">
        <div class="tp-panel-header">
          <span><span class="tp-dot" />production.ts</span>
          <button
            class="tp-copy"
            :class="{ copied: copied === 'production' }"
            :title="copied === 'production' ? 'Copied' : 'Copy'"
            :aria-label="copied === 'production' ? 'Copied' : 'Copy code'"
            @click="copyCode(productionCode, 'production')"
          />
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="productionHtml" v-html="productionHtml"></div>
        <pre v-else><code>{{ productionCode }}</code></pre>
      </div>
      <div class="tp-panel">
        <div class="tp-panel-header">
          <span><span class="tp-dot" />user-service.test.ts</span>
          <button
            class="tp-copy"
            :class="{ copied: copied === 'test' }"
            :title="copied === 'test' ? 'Copied' : 'Copy'"
            :aria-label="copied === 'test' ? 'Copied' : 'Copy code'"
            @click="copyCode(testCode, 'test')"
          />
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="testHtml" v-html="testHtml"></div>
        <pre v-else><code>{{ testCode }}</code></pre>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { highlightTs } from "../shiki";

const copied = ref<"production" | "test" | null>(null);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

async function copyCode(code: string, key: "production" | "test") {
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    // Clipboard API unavailable (e.g. an insecure context) - fall back to the legacy copy command.
    const textarea = document.createElement("textarea");
    textarea.value = code;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
  copied.value = key;
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    copied.value = null;
  }, 1500);
}

const productionCode = `import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

const timeProvider = createTimeProvider.for(plugin).create();

class UserService {
  constructor(private readonly timeProvider: ITimeProvider<Date>) {}

  createUser() {
    return { createdAt: this.timeProvider.clock.utcNow() };
  }
}`;

const testCode = `import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

using timeProvider = createTimeProvider
  .for(plugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00:00.000Z")
  .create();

let retries = 0;
using handle = timeProvider.timers.every({seconds: 1}, () => retries++);
timeProvider.clock.advance({ seconds: 3 });

expect(retries).toBe(3); // synchronous — no await, no real timers`;

// These two snippets are fixed, so highlighting them once on mount is enough - unlike the
// Playground's, which changes with every selection and re-highlights reactively instead.
const productionHtml = ref("");
const testHtml = ref("");
onMounted(async () => {
  [productionHtml.value, testHtml.value] = await Promise.all([
    highlightTs(productionCode),
    highlightTs(testCode),
  ]);
});
</script>
