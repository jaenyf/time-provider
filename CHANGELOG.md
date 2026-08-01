# Changelog

> Aggregated view of every published package's changelog, generated automatically from `packages/*/CHANGELOG.md` after each release. Only the section between the markers below is auto-managed - edit the relevant package's own changelog instead of editing it directly.

<!-- aggregate-changelog:start -->

## 2026-08-01

### @time-provider/addon-animation-frame 0.1.0

### Features

* animation-frame api addon ([#109](https://github.com/jaenyf/time-provider/issues/109)) ([efd5327](https://github.com/jaenyf/time-provider/commit/efd53279daff2b2144430fc6b532942ee5a32ed6))

### @time-provider/core 1.3.0

### Features

* animation-frame api addon ([#109](https://github.com/jaenyf/time-provider/issues/109)) ([efd5327](https://github.com/jaenyf/time-provider/commit/efd53279daff2b2144430fc6b532942ee5a32ed6))
* performance api ([#108](https://github.com/jaenyf/time-provider/issues/108)) ([cde88b7](https://github.com/jaenyf/time-provider/commit/cde88b7147813df1a8d450e55125b60326392549))


### Performance Improvements

* **deterministic runtime:** performances improvement ([#110](https://github.com/jaenyf/time-provider/issues/110)) ([f5e84b3](https://github.com/jaenyf/time-provider/commit/f5e84b384863fc31347fc8b94040bb1b2453a71e))

### @time-provider/plugin-dayjs 0.4.0

### Features

* performance api ([#108](https://github.com/jaenyf/time-provider/issues/108)) ([cde88b7](https://github.com/jaenyf/time-provider/commit/cde88b7147813df1a8d450e55125b60326392549))

### @time-provider/plugin-luxon 0.4.0

### Features

* performance api ([#108](https://github.com/jaenyf/time-provider/issues/108)) ([cde88b7](https://github.com/jaenyf/time-provider/commit/cde88b7147813df1a8d450e55125b60326392549))

### @time-provider/plugin-moment 0.4.0

### Features

* performance api ([#108](https://github.com/jaenyf/time-provider/issues/108)) ([cde88b7](https://github.com/jaenyf/time-provider/commit/cde88b7147813df1a8d450e55125b60326392549))

### @time-provider/plugin-moment-timezone 0.2.0

### Features

* performance api ([#108](https://github.com/jaenyf/time-provider/issues/108)) ([cde88b7](https://github.com/jaenyf/time-provider/commit/cde88b7147813df1a8d450e55125b60326392549))

### @time-provider/plugin-native 0.4.0

### Features

* performance api ([#108](https://github.com/jaenyf/time-provider/issues/108)) ([cde88b7](https://github.com/jaenyf/time-provider/commit/cde88b7147813df1a8d450e55125b60326392549))

### @time-provider/plugin-temporal 0.4.0

### Features

* performance api ([#108](https://github.com/jaenyf/time-provider/issues/108)) ([cde88b7](https://github.com/jaenyf/time-provider/commit/cde88b7147813df1a8d450e55125b60326392549))

## 2026-07-25

### @time-provider/core 1.2.0

### ⚠ BREAKING CHANGES

* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88))
* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81))

### Features

* expose host and local timezone ([#99](https://github.com/jaenyf/time-provider/issues/99)) ([743d237](https://github.com/jaenyf/time-provider/commit/743d2376591ca5835932f6b7786c49db9abed467))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88)) ([77437dc](https://github.com/jaenyf/time-provider/commit/77437dc306047df71c1b7e9aa6961ef9753a1a28))
* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103)) ([5e6ca60](https://github.com/jaenyf/time-provider/commit/5e6ca60c36663ea30fcdea07b9eb3c02e7cdb9f4))


### Bug Fixes

* **core:** prevent runtime mutability when created ([#102](https://github.com/jaenyf/time-provider/issues/102)) ([e1678e7](https://github.com/jaenyf/time-provider/commit/e1678e7be4bcd7d48900e7669c5fd084bfaff547))
* issues [#104](https://github.com/jaenyf/time-provider/issues/104) and [#105](https://github.com/jaenyf/time-provider/issues/105) ([#106](https://github.com/jaenyf/time-provider/issues/106)) ([44c735a](https://github.com/jaenyf/time-provider/commit/44c735afbcfd5f0b3ad07a6fa2d845380471ec54))


### Performance Improvements

* reduce time complexity for deterministic setTimeout and setInterval ([#84](https://github.com/jaenyf/time-provider/issues/84)) ([a3b601b](https://github.com/jaenyf/time-provider/commit/a3b601b25311393daa12fc5bd34b9d0eea7c1f18))


### Code Refactoring

* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81)) ([fb969bd](https://github.com/jaenyf/time-provider/commit/fb969bd1a87a87a8f2ca01f84adfe265ef2c2ccd))

### @time-provider/plugin-dayjs 0.3.0

### ⚠ BREAKING CHANGES

* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88))
* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81))

### Features

* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88)) ([77437dc](https://github.com/jaenyf/time-provider/commit/77437dc306047df71c1b7e9aa6961ef9753a1a28))
* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103)) ([5e6ca60](https://github.com/jaenyf/time-provider/commit/5e6ca60c36663ea30fcdea07b9eb3c02e7cdb9f4))


### Code Refactoring

* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81)) ([fb969bd](https://github.com/jaenyf/time-provider/commit/fb969bd1a87a87a8f2ca01f84adfe265ef2c2ccd))

### @time-provider/plugin-luxon 0.3.0

### ⚠ BREAKING CHANGES

* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88))
* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81))

### Features

* expose host and local timezone ([#99](https://github.com/jaenyf/time-provider/issues/99)) ([743d237](https://github.com/jaenyf/time-provider/commit/743d2376591ca5835932f6b7786c49db9abed467))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88)) ([77437dc](https://github.com/jaenyf/time-provider/commit/77437dc306047df71c1b7e9aa6961ef9753a1a28))
* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103)) ([5e6ca60](https://github.com/jaenyf/time-provider/commit/5e6ca60c36663ea30fcdea07b9eb3c02e7cdb9f4))


### Code Refactoring

* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81)) ([fb969bd](https://github.com/jaenyf/time-provider/commit/fb969bd1a87a87a8f2ca01f84adfe265ef2c2ccd))

### @time-provider/plugin-moment 0.3.0

### ⚠ BREAKING CHANGES

* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88))
* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81))

### Features

* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88)) ([77437dc](https://github.com/jaenyf/time-provider/commit/77437dc306047df71c1b7e9aa6961ef9753a1a28))
* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103)) ([5e6ca60](https://github.com/jaenyf/time-provider/commit/5e6ca60c36663ea30fcdea07b9eb3c02e7cdb9f4))


### Code Refactoring

* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81)) ([fb969bd](https://github.com/jaenyf/time-provider/commit/fb969bd1a87a87a8f2ca01f84adfe265ef2c2ccd))

### @time-provider/plugin-moment-timezone 0.1.0

### ⚠ BREAKING CHANGES

* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103))

### Features

* expose host and local timezone ([#99](https://github.com/jaenyf/time-provider/issues/99)) ([743d237](https://github.com/jaenyf/time-provider/commit/743d2376591ca5835932f6b7786c49db9abed467))
* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103)) ([5e6ca60](https://github.com/jaenyf/time-provider/commit/5e6ca60c36663ea30fcdea07b9eb3c02e7cdb9f4))

### @time-provider/plugin-native 0.3.0

### ⚠ BREAKING CHANGES

* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88))
* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81))

### Features

* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88)) ([77437dc](https://github.com/jaenyf/time-provider/commit/77437dc306047df71c1b7e9aa6961ef9753a1a28))
* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103)) ([5e6ca60](https://github.com/jaenyf/time-provider/commit/5e6ca60c36663ea30fcdea07b9eb3c02e7cdb9f4))


### Code Refactoring

* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81)) ([fb969bd](https://github.com/jaenyf/time-provider/commit/fb969bd1a87a87a8f2ca01f84adfe265ef2c2ccd))

### @time-provider/plugin-temporal 0.3.0

### ⚠ BREAKING CHANGES

* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88))
* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81))

### Features

* expose host and local timezone ([#99](https://github.com/jaenyf/time-provider/issues/99)) ([743d237](https://github.com/jaenyf/time-provider/commit/743d2376591ca5835932f6b7786c49db9abed467))
* introduce timezone and true local time support ([#88](https://github.com/jaenyf/time-provider/issues/88)) ([77437dc](https://github.com/jaenyf/time-provider/commit/77437dc306047df71c1b7e9aa6961ef9753a1a28))
* make packages tree-shakable ([#103](https://github.com/jaenyf/time-provider/issues/103)) ([5e6ca60](https://github.com/jaenyf/time-provider/commit/5e6ca60c36663ea30fcdea07b9eb3c02e7cdb9f4))


### Bug Fixes

* assume Temporal namespace is already available ([#97](https://github.com/jaenyf/time-provider/issues/97)) ([a9837a6](https://github.com/jaenyf/time-provider/commit/a9837a6553a812e8c4e7cc0a86192edaeb9d9eb1)), closes [#96](https://github.com/jaenyf/time-provider/issues/96)


### Code Refactoring

* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81)) ([fb969bd](https://github.com/jaenyf/time-provider/commit/fb969bd1a87a87a8f2ca01f84adfe265ef2c2ccd))

## 2026-07-18

### @time-provider/core 1.1.0

### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* ci badges display on readmes ([#66](https://github.com/jaenyf/time-provider/issues/66)) ([2c84a73](https://github.com/jaenyf/time-provider/commit/2c84a73141e8eea1b4052e9f574372adabb4f5df))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)
* **core:** prevent some scheduled callbacks to run when time is fixed ([#59](https://github.com/jaenyf/time-provider/issues/59)) ([bf8236c](https://github.com/jaenyf/time-provider/commit/bf8236c7ab1da30d32466100e0f5e7684920577c)), closes [#57](https://github.com/jaenyf/time-provider/issues/57)

### @time-provider/plugin-dayjs 0.2.0

### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)

### @time-provider/plugin-luxon 0.2.0

### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)

### @time-provider/plugin-moment 0.2.0

### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)

### @time-provider/plugin-moment-timezone 0.2.0

### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)

### @time-provider/plugin-native 0.2.0

### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)

### @time-provider/plugin-temporal 0.2.0

### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)

## 2026-07-16

### @time-provider/core 1.0.1

### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

### @time-provider/plugin-dayjs 0.1.1

### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

### @time-provider/plugin-luxon 0.1.1

### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

### @time-provider/plugin-moment 0.1.1

### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

### @time-provider/plugin-moment-timezone 0.1.1

### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

### @time-provider/plugin-native 0.1.1

### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

### @time-provider/plugin-temporal 0.1.1

### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

## 2026-07-15

### @time-provider/core 1.0.0

### ⚠ BREAKING CHANGES

* segregates concerns through interfaces ([#41](https://github.com/jaenyf/time-provider/issues/41))

### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))


### Bug Fixes

* **core,repo:** adapt readmes for namespaces ([#42](https://github.com/jaenyf/time-provider/issues/42)) ([6b0a9e9](https://github.com/jaenyf/time-provider/commit/6b0a9e9d8353d26585b2a5193fa780f884aa7bfa))


### Code Refactoring

* segregates concerns through interfaces ([#41](https://github.com/jaenyf/time-provider/issues/41)) ([7d1a448](https://github.com/jaenyf/time-provider/commit/7d1a448a6057a81abf00ee5c0780673b75a770d7))

### @time-provider/plugin-dayjs 0.1.0

### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))

### @time-provider/plugin-luxon 0.1.0

### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))

### @time-provider/plugin-moment 0.1.0

### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))

### @time-provider/plugin-moment-timezone 0.1.0

### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))

### @time-provider/plugin-native 0.1.0

### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))

### @time-provider/plugin-temporal 0.1.0

### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))

<!-- aggregate-changelog:end -->

## 0.0.4 - 2026-07-08

### Added

- Sequential time adapters

### Changed

- Updated builder api
- Unminified NPM packages files
- Improved codebase and code coverage to 100%

## 0.0.3 - 2026-07-06

### Changed

- Updated TimeProviderCreator builder api
- Improved readme files
- Improved codebase

## 0.0.2 - 2026-06-30

### Fixed

- Fixed plugins packaging

## 0.0.1 - 2026-06-30

### Added

- Readme files for NPM packages

## 0.0.0 - 2026-06-29

### Added

- Initial core library
- Initial plugin for Day.js
- Initial plugin for Luxon
- Initial plugin for Moment
- Initial plugin for native Dates
- Initial plugin for Temporal
- Unit tests with 98% of code covered
