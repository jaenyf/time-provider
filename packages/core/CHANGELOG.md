# Changelog

## [1.2.0](https://github.com/jaenyf/time-provider/compare/core-v1.1.0...core-v1.2.0) (2026-07-24)


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


### Performance Improvements

* reduce time complexity for deterministic setTimeout and setInterval ([#84](https://github.com/jaenyf/time-provider/issues/84)) ([a3b601b](https://github.com/jaenyf/time-provider/commit/a3b601b25311393daa12fc5bd34b9d0eea7c1f18))


### Code Refactoring

* code quality ([#81](https://github.com/jaenyf/time-provider/issues/81)) ([fb969bd](https://github.com/jaenyf/time-provider/commit/fb969bd1a87a87a8f2ca01f84adfe265ef2c2ccd))

## [1.1.0](https://github.com/jaenyf/time-provider/compare/core-v1.0.1...core-v1.1.0) (2026-07-18)


### Bug Fixes

* automation ([#60](https://github.com/jaenyf/time-provider/issues/60)) ([fd3a078](https://github.com/jaenyf/time-provider/commit/fd3a0789ef1b02ded435678f227263531c0c0b7a))
* ci badges display on readmes ([#66](https://github.com/jaenyf/time-provider/issues/66)) ([2c84a73](https://github.com/jaenyf/time-provider/commit/2c84a73141e8eea1b4052e9f574372adabb4f5df))
* **core,plugins:** atomicity of manual advance ([#58](https://github.com/jaenyf/time-provider/issues/58)) ([2086dcd](https://github.com/jaenyf/time-provider/commit/2086dcd32ef7bd3d2ab7e105ee37314d3253507c)), closes [#56](https://github.com/jaenyf/time-provider/issues/56)
* **core:** prevent some scheduled callbacks to run when time is fixed ([#59](https://github.com/jaenyf/time-provider/issues/59)) ([bf8236c](https://github.com/jaenyf/time-provider/commit/bf8236c7ab1da30d32466100e0f5e7684920577c)), closes [#57](https://github.com/jaenyf/time-provider/issues/57)

## [1.0.1](https://github.com/jaenyf/time-provider/compare/core-v1.0.0...core-v1.0.1) (2026-07-16)


### Bug Fixes

* add provenance flag when publishing to npm ([5cb1750](https://github.com/jaenyf/time-provider/commit/5cb175032cdbf48722a8e8f4dad5821d2303c4b7))
* npm automated publishing ([de05af4](https://github.com/jaenyf/time-provider/commit/de05af4f6e5e9596b808130dcb0bec1b143cedaa))

## [1.0.0](https://github.com/jaenyf/time-provider/compare/core-v0.0.4...core-v1.0.0) (2026-07-15)


### ⚠ BREAKING CHANGES

* segregates concerns through interfaces ([#41](https://github.com/jaenyf/time-provider/issues/41))

### Features

* **scheduler:** add a scheduler ([#37](https://github.com/jaenyf/time-provider/issues/37)) ([1af6307](https://github.com/jaenyf/time-provider/commit/1af6307ba837d3707b42e8dbf42a4101dee66f05))


### Bug Fixes

* **core,repo:** adapt readmes for namespaces ([#42](https://github.com/jaenyf/time-provider/issues/42)) ([6b0a9e9](https://github.com/jaenyf/time-provider/commit/6b0a9e9d8353d26585b2a5193fa780f884aa7bfa))


### Code Refactoring

* segregates concerns through interfaces ([#41](https://github.com/jaenyf/time-provider/issues/41)) ([7d1a448](https://github.com/jaenyf/time-provider/commit/7d1a448a6057a81abf00ee5c0780673b75a770d7))
