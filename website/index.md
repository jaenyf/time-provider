---
layout: home
title: Time-Provider — Time is a dependency
titleTemplate: false
hero:
  name: Time-Provider
  text: Time is a dependency.
  tagline: Your single time interface for all your JavaScript / TypeScript projects.
  image:
    light: /logo-with-text-light.svg
    dark: /logo-with-text-dark.svg
    alt: Time-Provider
  actions:
    - theme: brand
      text: Get in on NPM
      link: https://www.npmjs.com/package/@time-provider/core
    - theme: brand
      text: Open Playground
      link: /playground
    - theme: alt
      text: Read the Guide
      link: /guide/
    - theme: alt
      text: GitHub
      link: https://github.com/jaenyf/time-provider
features:
  - icon: 🌳
    title: Tree-shakable
    link: guide/mental-model#two-entry-points-on-purpose
    details: Your deterministic code is not bundled in production.
  - icon: 📦
    title: Zero runtime dependencies
    link: guide/#zero-runtime-dependencies
    details: Core library ships nothing into your dependency tree and each plugin depends only on core and its own date library.
  - icon: 🧪
    title: No global monkey-patching
    link: guide/#why-not-just-mock-date
    details: Scoped per call site, no process-wide patch, no restore/cleanup step.
  - icon: 🛡️
    title: Type-safe
    link: guide/#type-safe-end-to-end
    details: Fully typed from your 1st import to your favorite date library.
  - icon: ⏱️
    title: Deterministic timers
    link: guide/scheduler/
    details: Driven by the clock strategy, not the real event loop.
  - icon: 🔌
    title: Bring your own date library
    link: plugins/
    details: Multiple adapters available (Temporal, Day.js, Luxon, Moment.js, native Date, etc.).
  - icon: 🌍
    title: Timezone support for local time
    link: guide/timezones/
    details: You define what local is.
  - icon: 🕓
    title: Four clock strategies
    link: guide/clock-strategies/
    details: System, Fixed, Manual, Sequential.
  - icon: 🧩
    title: Extensible via addons
    link: guide/addons/
    details: Composes extra facades onto a Time-Provider.
---

<HomeShowcase />
