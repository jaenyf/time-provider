# Changelog

## [0.3.0](https://github.com/jaenyf/time-provider/compare/addon-animation-frame-v0.2.0...addon-animation-frame-v0.3.0) (2026-08-22)


### ⚠ BREAKING CHANGES

* rewrite main timers api (once, every, recurring, wait) and add compat addon ([#150](https://github.com/jaenyf/time-provider/issues/150))

### Features

* makes runtimes, timer handles and addons disposable or abortable ([#152](https://github.com/jaenyf/time-provider/issues/152)) ([2ead7d7](https://github.com/jaenyf/time-provider/commit/2ead7d74e4abbf8504b12990b20663b413c752c2))
* rewrite main timers api (once, every, recurring, wait) and add compat addon ([#150](https://github.com/jaenyf/time-provider/issues/150)) ([fe68409](https://github.com/jaenyf/time-provider/commit/fe684096744f7fceddd4d5e58167a16841fad068))


### Bug Fixes

* **core:** issue[#147](https://github.com/jaenyf/time-provider/issues/147) ([#149](https://github.com/jaenyf/time-provider/issues/149)) ([47a2c0a](https://github.com/jaenyf/time-provider/commit/47a2c0a260f35a879dde3185a7f6daa2ded96512))

## [0.2.0](https://github.com/jaenyf/time-provider/compare/addon-animation-frame-v0.1.0...addon-animation-frame-v0.2.0) (2026-08-10)


### Features

* add setRecurring / clearRecurring to IScheduler ([#133](https://github.com/jaenyf/time-provider/issues/133)) ([564edb8](https://github.com/jaenyf/time-provider/commit/564edb8a2cf29c161fa4749f60ba3e827779b63a))
* **core:** export the manual Time-Provider types and addon facade shapes ([30a6290](https://github.com/jaenyf/time-provider/commit/30a629093e6b280806afb20ba6e472103a09378d))


### Bug Fixes

* **plugins:** bump peered dependencies to core to its next version ([b5cc641](https://github.com/jaenyf/time-provider/commit/b5cc641901d0b9a8d7660b849d1026dd23991a87))
* **release:** use real semver versioning instead of always-bump-minor ([#131](https://github.com/jaenyf/time-provider/issues/131)) ([5130ec8](https://github.com/jaenyf/time-provider/commit/5130ec886909502640a428cabd08da4effd82f0c))

## [0.1.0](https://github.com/jaenyf/time-provider/compare/addon-animation-frame-v0.0.1...addon-animation-frame-v0.1.0) (2026-08-01)


### Features

* animation-frame api addon ([#109](https://github.com/jaenyf/time-provider/issues/109)) ([efd5327](https://github.com/jaenyf/time-provider/commit/efd53279daff2b2144430fc6b532942ee5a32ed6))
