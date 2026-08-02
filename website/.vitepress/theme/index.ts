import { defineAsyncComponent, h } from "vue";
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import HomeShowcase from "./components/HomeShowcase.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
import "./custom.css";

// Lazy-loaded: Playground.vue pulls in Shiki + an in-browser TS compiler
// (~1.3MB). Only /playground needs that weight - a static import here would
// ship it as part of the shared theme chunk on every page.
const Playground = defineAsyncComponent(() => import("./components/Playground.vue"));

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      "nav-bar-content-after": () => h(ThemeToggle),
      "nav-screen-content-after": () => h(ThemeToggle),
    });
  },
  enhanceApp({ app }) {
    app.component("HomeShowcase", HomeShowcase);
    app.component("Playground", Playground);
  },
} satisfies Theme;
