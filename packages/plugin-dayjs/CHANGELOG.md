# Changelog

## [0.6.0](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.5.2...plugin-dayjs-v0.6.0) (2026-09-24)


### Features

* dry-run and publish every package to both npm and JSR ([a937b71](https://github.com/jaenyf/time-provider/commit/a937b71a618690a46147ce853d18aae10490aec3))
* publish a CommonJS build next to the ESM one ([c114f25](https://github.com/jaenyf/time-provider/commit/c114f25b9cef138771b3de568e4ee3e0c64dc397))


### Bug Fixes

* accept node 18.18 in every published package's engines ([6927c1f](https://github.com/jaenyf/time-provider/commit/6927c1f80daa5a66793f034dc1fff8f763767412))
* ship the MIT notice with every published package ([206ecd4](https://github.com/jaenyf/time-provider/commit/206ecd4589a3c66a7ffc04f11a4f449701c17346))
* widen the date-library peer ranges to the oldest versions that pass ([51afc4e](https://github.com/jaenyf/time-provider/commit/51afc4ea32671b767b27d8f734952f61c828770b))

## [0.5.2](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.5.1...plugin-dayjs-v0.5.2) (2026-09-22)


### Bug Fixes

* correct the npm keywords and the moment-timezone description ([1befcbe](https://github.com/jaenyf/time-provider/commit/1befcbec2e65577f819bdf4af761be0129b9c2fc))
* declare node &gt;=20.4.0 in every published package's engines ([58ad7e7](https://github.com/jaenyf/time-provider/commit/58ad7e7ab8b60abc123c937a7de8cb32038e5682))
* point every package's readme badges at its own package ([fddacae](https://github.com/jaenyf/time-provider/commit/fddacae809f6f6d973327be72e96f92a52bd7e23))
* review implementation ([#172](https://github.com/jaenyf/time-provider/issues/172)) ([10ed757](https://github.com/jaenyf/time-provider/commit/10ed7571a2ebd4395e2733705fe29898f9f15dc1))

## [0.5.1](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.5.0...plugin-dayjs-v0.5.1) (2026-09-20)


### Bug Fixes

* require @time-provider/core ^2.0.0 in plugin and addon peer ranges ([94e07e7](https://github.com/jaenyf/time-provider/commit/94e07e7c3ebf003244ed34181a4a565ad0f67043))
* require @time-provider/core ^3.0.0 in plugin and addon peer ranges ([cc560c8](https://github.com/jaenyf/time-provider/commit/cc560c8a66c31c02b2687a4c4fc6c579620c0a0b))

## [0.5.0](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.4.1...plugin-dayjs-v0.5.0) (2026-09-14)


### ⚠ BREAKING CHANGES

* rewrite main timers api (once, every, recurring, wait) and add compat addon ([#150](https://github.com/jaenyf/time-provider/issues/150))

### Features

* rewrite main timers api (once, every, recurring, wait) and add compat addon ([#150](https://github.com/jaenyf/time-provider/issues/150)) ([fe68409](https://github.com/jaenyf/time-provider/commit/fe684096744f7fceddd4d5e58167a16841fad068))

## [0.4.1](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.4.0...plugin-dayjs-v0.4.1) (2026-08-10)


### Bug Fixes

* **plugin-dayjs:** [#125](https://github.com/jaenyf/time-provider/issues/125) ([#126](https://github.com/jaenyf/time-provider/issues/126)) ([c2badf5](https://github.com/jaenyf/time-provider/commit/c2badf5bed9c80c3137810b0bbed5a49905d8543))
* **plugins:** bump peered dependencies to core to its next version ([b5cc641](https://github.com/jaenyf/time-provider/commit/b5cc641901d0b9a8d7660b849d1026dd23991a87))
* **release:** use real semver versioning instead of always-bump-minor ([#131](https://github.com/jaenyf/time-provider/issues/131)) ([5130ec8](https://github.com/jaenyf/time-provider/commit/5130ec886909502640a428cabd08da4effd82f0c))

## [0.4.0](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.3.0...plugin-dayjs-v0.4.0) (2026-08-01)


### Features

* performance api ([#108](https://github.com/jaenyf/time-provider/issues/108)) ([cde88b7](https://github.com/jaenyf/time-provider/commit/cde88b7147813df1a8d450e55125b60326392549))

## [0.3.0](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.2.0...plugin-dayjs-v0.3.0) (2026-07-25)


### ⚠ BREAKING CHANGES

* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88))
* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81))

### Features

* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88)) ([77437dc](https://github.com/jaenyf/time-provider/commit/77437dc306047df71c1b7e9aa6961ef9753a1a28))
* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103)) ([5e6ca60](https://github.com/jaenyf/time-provider/commit/5e6ca60c36663ea30fcdea07b9eb3c02e7cdb9f4))


### Code Refactoring

* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81)) ([fb969bd](https://github.com/jaenyf/time-provider/commit/fb969bd1a87a87a8f2ca01f84adfe265ef2c2ccd))

## [0.2.0](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-0.1.1...plugin-dayjs-v0.2.0) (2026-07-18)


### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)

## [0.1.1](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.1.0...plugin-dayjs-v0.1.1) (2026-07-16)


### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

## [0.1.0](https://github.com/jaenyf/time-provider/compare/plugin-dayjs-v0.0.4...plugin-dayjs-v0.1.0) (2026-07-15)


### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))
