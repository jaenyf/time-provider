import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Time-Provider",
  description: "Your single time interface for all your JavaScript / TypeScript projects.",
  lang: "en-US",
  base: "/time-provider/",
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: "https://jaenyf.github.io/time-provider/" },
  vite: {
    build: {
      chunkSizeWarningLimit: 1200,
    },
  },
  head: [
    [
      "link",
      {
        rel: "icon",
        href: "/time-provider/favicon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        href: "/time-provider/favicon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    ["meta", { name: "theme-color", content: "#0f766e" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Time-Provider" }],
    ["meta", { property: "og:title", content: "Time-Provider — Time is a dependency" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Make time an explicit, injectable dependency. Four clock strategies, deterministic timers, bring-your-own date library.",
      },
    ],
  ],
  themeConfig: {
    logo: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
    search: { provider: "local" },
    socialLinks: [{ icon: "github", link: "https://github.com/jaenyf/time-provider" }],
    editLink: {
      pattern: "https://github.com/jaenyf/time-provider/edit/main/website/:path",
      text: "Edit this page on GitHub",
    },
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Playground", link: "/playground" },
      { text: "Plugins", link: "/plugins/" },
      { text: "API", link: "/api/" },
      {
        text: "Links",
        items: [
          { text: "NPM", link: "https://www.npmjs.com/package/@time-provider/core" },
          {
            text: "Changelog",
            link: "https://github.com/jaenyf/time-provider/blob/main/CHANGELOG.md",
          },
          {
            text: "Architecture",
            link: "https://github.com/jaenyf/time-provider/blob/main/ARCHITECTURE.md",
          },
          {
            text: "Contributing",
            link: "https://github.com/jaenyf/time-provider/blob/main/CONTRIBUTING.md",
          },
          {
            text: "Benchmark",
            link: "https://github.com/jaenyf/time-provider/blob/main/BENCHMARK.md",
          },
        ],
      },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is Time-Provider", link: "/guide/" },
          { text: "Install", link: "/guide/install" },
          { text: "Quick Start", link: "/guide/quick-start" },
          { text: "Mental Model", link: "/guide/mental-model" },
        ],
      },
      {
        text: "Clock Strategies",
        items: [
          { text: "Overview", link: "/guide/clock-strategies" },
          { text: "System Clock", link: "/guide/system-clock" },
          { text: "Fixed Clock", link: "/guide/fixed-clock" },
          { text: "Manual Clock", link: "/guide/manual-clock" },
          { text: "Sequential Clock", link: "/guide/sequential-clock" },
        ],
      },
      {
        text: "Concepts",
        items: [
          { text: "Deterministic Scheduler", link: "/guide/scheduler" },
          { text: "Timezones & Local Time", link: "/guide/timezones" },
          { text: "Testing With Time-Provider", link: "/guide/testing" },
          { text: "Addons", link: "/guide/addons" },
          { text: "Cron Schedules", link: "/guide/cron" },
        ],
      },
      {
        text: "Plugins (Adapters)",
        items: [
          { text: "Overview", link: "/plugins/" },
          { text: "Native Date", link: "/plugins/native" },
          { text: "Day.js", link: "/plugins/dayjs" },
          { text: "Luxon", link: "/plugins/luxon" },
          { text: "Moment.js", link: "/plugins/moment" },
          { text: "Moment.js + moment-timezone", link: "/plugins/moment-timezone" },
          { text: "Temporal", link: "/plugins/temporal" },
          { text: "Writing a Custom Plugin", link: "/plugins/custom" },
        ],
      },
      {
        text: "API Reference",
        items: [
          { text: "createTimeProvider", link: "/api/" },
          { text: "ITimeProvider", link: "/api/time-provider" },
          { text: "IClock", link: "/api/clock" },
          { text: "IParser", link: "/api/parser" },
          { text: "IScheduler", link: "/api/scheduler" },
          { text: "IPerformance", link: "/api/performance" },
        ],
      },
    ],
  },
});
