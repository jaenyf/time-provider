<template>
  <div class="tp-theme-toggle" role="radiogroup" aria-label="Color theme">
    <button
      v-for="option in options"
      :key="option.mode"
      type="button"
      role="radio"
      :aria-checked="mode === option.mode"
      :title="option.label"
      :aria-label="option.label"
      class="tp-theme-toggle-btn"
      :class="{ active: mode === option.mode }"
      @click="setMode(option.mode)"
    >
      <span :class="option.icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

type Mode = "light" | "dark" | "auto";

// Reuses VitePress's own storage key and value format ('light' | 'dark' | 'auto') so its
// pre-hydration anti-flash inline script (which already understands 'auto') stays correct, and
// so this stays in sync with the default theme's own (hidden, see custom.css) switch.
const STORAGE_KEY = "vitepress-theme-appearance";

const options: { mode: Mode; label: string; icon: string }[] = [
  { mode: "light", label: "Light", icon: "vpi-sun" },
  { mode: "auto", label: "System", icon: "vpi-monitor" },
  { mode: "dark", label: "Dark", icon: "vpi-moon" },
];

const mode = ref<Mode>("auto");
let media: MediaQueryList | undefined;

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(value: Mode): void {
  const isDark = value === "dark" || (value === "auto" && prefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

function setMode(value: Mode): void {
  const oldValue = localStorage.getItem(STORAGE_KEY);
  mode.value = value;
  localStorage.setItem(STORAGE_KEY, value);
  // The native `storage` event only fires in *other* tabs, never the one that made the change.
  // VitePress's own (now hidden, see custom.css) switch reads this same key through VueUse's
  // useStorage, which relies on exactly that event to notice changes - without dispatching one
  // ourselves, its watcher stays stuck on whatever mode was active at page load and keeps
  // following the system preference even after picking light/dark here, fighting this component
  // for the `dark` class. Mirrors the payload VueUse's own useStorage dispatches on write.
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: STORAGE_KEY,
      oldValue,
      newValue: value,
      storageArea: localStorage,
    }),
  );
  apply(value);
}

function onSystemChange(): void {
  if (mode.value === "auto") apply("auto");
}

function onStorage(event: StorageEvent): void {
  if (event.key === STORAGE_KEY && event.newValue) {
    mode.value = event.newValue as Mode;
    apply(mode.value);
  }
}

onMounted(() => {
  mode.value = (localStorage.getItem(STORAGE_KEY) as Mode | null) ?? "auto";
  media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
});

onBeforeUnmount(() => {
  media?.removeEventListener("change", onSystemChange);
  window.removeEventListener("storage", onStorage);
});
</script>
