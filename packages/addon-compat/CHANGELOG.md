# Changelog

## [0.3.0](https://github.com/jaenyf/time-provider/compare/addon-compat-v0.2.1...addon-compat-v0.3.0) (2026-09-24)


### ⚠ BREAKING CHANGES

* move performance to timings and monotonic clock ([#174](https://github.com/jaenyf/time-provider/issues/174))

### Features

* dry-run and publish every package to both npm and JSR ([a937b71](https://github.com/jaenyf/time-provider/commit/a937b71a618690a46147ce853d18aae10490aec3))
* publish a CommonJS build next to the ESM one ([c114f25](https://github.com/jaenyf/time-provider/commit/c114f25b9cef138771b3de568e4ee3e0c64dc397))


### Bug Fixes

* accept node 18.18 in every published package's engines ([6927c1f](https://github.com/jaenyf/time-provider/commit/6927c1f80daa5a66793f034dc1fff8f763767412))
* ship the MIT notice with every published package ([206ecd4](https://github.com/jaenyf/time-provider/commit/206ecd4589a3c66a7ffc04f11a4f449701c17346))


### Code Refactoring

* move performance to timings and monotonic clock ([#174](https://github.com/jaenyf/time-provider/issues/174)) ([04fc567](https://github.com/jaenyf/time-provider/commit/04fc567f6584be028aa60a806e272730f4097560))

## [0.2.1](https://github.com/jaenyf/time-provider/compare/addon-compat-v0.2.0...addon-compat-v0.2.1) (2026-09-22)


### Bug Fixes

* correct the npm keywords and the moment-timezone description ([1befcbe](https://github.com/jaenyf/time-provider/commit/1befcbec2e65577f819bdf4af761be0129b9c2fc))
* declare node &gt;=20.4.0 in every published package's engines ([58ad7e7](https://github.com/jaenyf/time-provider/commit/58ad7e7ab8b60abc123c937a7de8cb32038e5682))
* point every package's readme badges at its own package ([fddacae](https://github.com/jaenyf/time-provider/commit/fddacae809f6f6d973327be72e96f92a52bd7e23))
* review implementation ([#172](https://github.com/jaenyf/time-provider/issues/172)) ([10ed757](https://github.com/jaenyf/time-provider/commit/10ed7571a2ebd4395e2733705fe29898f9f15dc1))

## [0.2.0](https://github.com/jaenyf/time-provider/compare/addon-compat-v0.1.0...addon-compat-v0.2.0) (2026-09-20)


### ⚠ BREAKING CHANGES

* reshape api ([#170](https://github.com/jaenyf/time-provider/issues/170))

### Features

* idle callbacks ([#165](https://github.com/jaenyf/time-provider/issues/165)) ([f50df4f](https://github.com/jaenyf/time-provider/commit/f50df4f8cb52370d14e5bc11ea35e1f96131e87e))


### Bug Fixes

* require @time-provider/core ^3.0.0 in plugin and addon peer ranges ([cc560c8](https://github.com/jaenyf/time-provider/commit/cc560c8a66c31c02b2687a4c4fc6c579620c0a0b))


### Code Refactoring

* reshape api ([#170](https://github.com/jaenyf/time-provider/issues/170)) ([2c62f61](https://github.com/jaenyf/time-provider/commit/2c62f61a27c298513ce201f4875c90b42691f642))

## [0.1.0](https://github.com/jaenyf/time-provider/compare/addon-compat-v0.0.1...addon-compat-v0.1.0) (2026-09-14)


### ⚠ BREAKING CHANGES

* rewrite main timers api (once, every, recurring, wait) and add compat addon ([#150](https://github.com/jaenyf/time-provider/issues/150))

### Features

* makes runtimes, timer handles and addons disposable or abortable ([#152](https://github.com/jaenyf/time-provider/issues/152)) ([2ead7d7](https://github.com/jaenyf/time-provider/commit/2ead7d74e4abbf8504b12990b20663b413c752c2))
* rewrite main timers api (once, every, recurring, wait) and add compat addon ([#150](https://github.com/jaenyf/time-provider/issues/150)) ([fe68409](https://github.com/jaenyf/time-provider/commit/fe684096744f7fceddd4d5e58167a16841fad068))
