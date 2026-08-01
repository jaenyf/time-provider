import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import HomeShowcase from "./components/HomeShowcase.vue";
import Playground from "./components/Playground.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
import "./custom.css";

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
