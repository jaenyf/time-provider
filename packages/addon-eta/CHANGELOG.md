# Changelog

## [0.4.1](https://github.com/jaenyf/time-provider/compare/addon-eta-v0.4.0...addon-eta-v0.4.1) (2026-09-26)


### Bug Fixes

* **docs:** reduce amount jsdoc to reduce packages sizes ([22a03d4](https://github.com/jaenyf/time-provider/commit/22a03d4d6672b63a56d6c69209d3efdb328124bd))

## [0.4.0](https://github.com/jaenyf/time-provider/compare/addon-eta-v0.3.1...addon-eta-v0.4.0) (2026-09-24)


### Features

* dry-run and publish every package to both npm and JSR ([a937b71](https://github.com/jaenyf/time-provider/commit/a937b71a618690a46147ce853d18aae10490aec3))
* publish a CommonJS build next to the ESM one ([c114f25](https://github.com/jaenyf/time-provider/commit/c114f25b9cef138771b3de568e4ee3e0c64dc397))


### Bug Fixes

* accept node 18.18 in every published package's engines ([6927c1f](https://github.com/jaenyf/time-provider/commit/6927c1f80daa5a66793f034dc1fff8f763767412))
* ship the MIT notice with every published package ([206ecd4](https://github.com/jaenyf/time-provider/commit/206ecd4589a3c66a7ffc04f11a4f449701c17346))

## [0.3.1](https://github.com/jaenyf/time-provider/compare/addon-eta-v0.3.0...addon-eta-v0.3.1) (2026-09-22)


### Bug Fixes

* declare node &gt;=20.4.0 in every published package's engines ([58ad7e7](https://github.com/jaenyf/time-provider/commit/58ad7e7ab8b60abc123c937a7de8cb32038e5682))
* review implementation ([#172](https://github.com/jaenyf/time-provider/issues/172)) ([10ed757](https://github.com/jaenyf/time-provider/commit/10ed7571a2ebd4395e2733705fe29898f9f15dc1))

## [0.3.0](https://github.com/jaenyf/time-provider/compare/addon-eta-v0.2.0...addon-eta-v0.3.0) (2026-09-20)


### ⚠ BREAKING CHANGES

* reshape api ([#170](https://github.com/jaenyf/time-provider/issues/170))

### Features

* idle callbacks ([#165](https://github.com/jaenyf/time-provider/issues/165)) ([f50df4f](https://github.com/jaenyf/time-provider/commit/f50df4f8cb52370d14e5bc11ea35e1f96131e87e))


### Bug Fixes

* require @time-provider/core ^2.0.0 in plugin and addon peer ranges ([94e07e7](https://github.com/jaenyf/time-provider/commit/94e07e7c3ebf003244ed34181a4a565ad0f67043))
* require @time-provider/core ^3.0.0 in plugin and addon peer ranges ([cc560c8](https://github.com/jaenyf/time-provider/commit/cc560c8a66c31c02b2687a4c4fc6c579620c0a0b))


### Code Refactoring

* reshape api ([#170](https://github.com/jaenyf/time-provider/issues/170)) ([2c62f61](https://github.com/jaenyf/time-provider/commit/2c62f61a27c298513ce201f4875c90b42691f642))

## [0.2.0](https://github.com/jaenyf/time-provider/compare/addon-eta-v0.1.0...addon-eta-v0.2.0) (2026-09-14)


### ⚠ BREAKING CHANGES

* rewrite main timers api (once, every, recurring, wait) and add compat addon ([#150](https://github.com/jaenyf/time-provider/issues/150))

### Features

* makes runtimes, timer handles and addons disposable or abortable ([#152](https://github.com/jaenyf/time-provider/issues/152)) ([2ead7d7](https://github.com/jaenyf/time-provider/commit/2ead7d74e4abbf8504b12990b20663b413c752c2))
* rewrite main timers api (once, every, recurring, wait) and add compat addon ([#150](https://github.com/jaenyf/time-provider/issues/150)) ([fe68409](https://github.com/jaenyf/time-provider/commit/fe684096744f7fceddd4d5e58167a16841fad068))

## [0.1.0](https://github.com/jaenyf/time-provider/compare/addon-eta-v0.0.1...addon-eta-v0.1.0) (2026-08-10)


### Features

* **addon-eta:** add eta addon ([#140](https://github.com/jaenyf/time-provider/issues/140)) ([78967c2](https://github.com/jaenyf/time-provider/commit/78967c20a76eb811f327d6517e551738cad4b375))
* **core:** export the manual Time-Provider types and addon facade shapes ([30a6290](https://github.com/jaenyf/time-provider/commit/30a629093e6b280806afb20ba6e472103a09378d))
