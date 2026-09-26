# Changelog

## [0.5.1](https://github.com/jaenyf/time-provider/compare/addon-animation-frame-v0.5.0...addon-animation-frame-v0.5.1) (2026-09-26)


### Bug Fixes

* **docs:** reduce amount jsdoc to reduce packages sizes ([22a03d4](https://github.com/jaenyf/time-provider/commit/22a03d4d6672b63a56d6c69209d3efdb328124bd))

## [0.5.0](https://github.com/jaenyf/time-provider/compare/addon-animation-frame-v0.4.1...addon-animation-frame-v0.5.0) (2026-09-24)


### Features

* dry-run and publish every package to both npm and JSR ([a937b71](https://github.com/jaenyf/time-provider/commit/a937b71a618690a46147ce853d18aae10490aec3))
* publish a CommonJS build next to the ESM one ([c114f25](https://github.com/jaenyf/time-provider/commit/c114f25b9cef138771b3de568e4ee3e0c64dc397))


### Bug Fixes

* accept node 18.18 in every published package's engines ([6927c1f](https://github.com/jaenyf/time-provider/commit/6927c1f80daa5a66793f034dc1fff8f763767412))
* ship the MIT notice with every published package ([206ecd4](https://github.com/jaenyf/time-provider/commit/206ecd4589a3c66a7ffc04f11a4f449701c17346))

## [0.4.1](https://github.com/jaenyf/time-provider/compare/addon-animation-frame-v0.4.0...addon-animation-frame-v0.4.1) (2026-09-22)


### Bug Fixes

* **core:** throw on a disposed runtime ([cd8311e](https://github.com/jaenyf/time-provider/commit/cd8311e018a058a18e678b1360bc03383ef6c712))
* correct the npm keywords and the moment-timezone description ([1befcbe](https://github.com/jaenyf/time-provider/commit/1befcbec2e65577f819bdf4af761be0129b9c2fc))
* declare node &gt;=20.4.0 in every published package's engines ([58ad7e7](https://github.com/jaenyf/time-provider/commit/58ad7e7ab8b60abc123c937a7de8cb32038e5682))
* review implementation ([#172](https://github.com/jaenyf/time-provider/issues/172)) ([10ed757](https://github.com/jaenyf/time-provider/commit/10ed7571a2ebd4395e2733705fe29898f9f15dc1))

## [0.4.0](https://github.com/jaenyf/time-provider/compare/addon-animation-frame-v0.3.0...addon-animation-frame-v0.4.0) (2026-09-20)


### ⚠ BREAKING CHANGES

* reshape api ([#170](https://github.com/jaenyf/time-provider/issues/170))

### Features

* idle callbacks ([#165](https://github.com/jaenyf/time-provider/issues/165)) ([f50df4f](https://github.com/jaenyf/time-provider/commit/f50df4f8cb52370d14e5bc11ea35e1f96131e87e))


### Bug Fixes

* bind an addon-builder's chain methods to the chain that used it ([ef5f7d4](https://github.com/jaenyf/time-provider/commit/ef5f7d47e016f9564f29cf6ca06c43064619e604))
* require @time-provider/core ^2.0.0 in plugin and addon peer ranges ([94e07e7](https://github.com/jaenyf/time-provider/commit/94e07e7c3ebf003244ed34181a4a565ad0f67043))
* require @time-provider/core ^3.0.0 in plugin and addon peer ranges ([cc560c8](https://github.com/jaenyf/time-provider/commit/cc560c8a66c31c02b2687a4c4fc6c579620c0a0b))


### Code Refactoring

* reshape api ([#170](https://github.com/jaenyf/time-provider/issues/170)) ([2c62f61](https://github.com/jaenyf/time-provider/commit/2c62f61a27c298513ce201f4875c90b42691f642))

## [0.3.0](https://github.com/jaenyf/time-provider/compare/addon-animation-frame-v0.2.0...addon-animation-frame-v0.3.0) (2026-09-14)


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
