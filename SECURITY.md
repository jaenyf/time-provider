# Security Policy

## Scope

`time-provider` is a library for injecting time, timers, and timezone
handling into applications; it has no network, filesystem, or process
surface of its own. Reports about the packages under `packages/*`
(`@time-provider/core`, the `@time-provider/plugin-*` adapters and the
`@time-provider/addon-*` packages) are in scope. Reports about a third-party date library a plugin adapts (`dayjs`,
`luxon`, `moment`, `moment-timezone`, `@js-temporal/polyfill`) should go to
that project instead, unless the issue is specifically in how
`time-provider` uses it.

## Input validation and the trust boundary

`time-provider` is not a validation layer. Validate untrusted date, duration
and timezone input in your application, before it reaches the library.

What the library does check:

- `TimeInputValidator.assertValid()` rejects `undefined`, `null`, `NaN` and
  empty or whitespace-only strings for a time value.
- `toDuration()` and `toInstant()` reject a spec whose fields don't add up to
  a finite number of milliseconds; `toInstant()` also rejects a negative field.
- A plugin rejects a timezone its own date library can't resolve.
- `@time-provider/addon-cron` parses expressions strictly: it never evaluates
  them, and it rejects a field that is malformed or out of range for the
  calendar behind the runtime.

What it does not check:

- Whether an arbitrary `TDate` value is semantically valid. That belongs to
  the date library a plugin adapts, and is reported however that library
  reports it.
- The magnitude of a finite duration. A caller can schedule a timer an
  arbitrary distance into the future.

The branded `DurationMilliseconds` and `EpochMilliseconds` types are
compile-time constructs. They disappear at runtime and stop nothing that
reaches the library from JavaScript, from `any`, or across a network boundary.

## Supported Versions

`@time-provider/core` and each `@time-provider/plugin-*` and
`@time-provider/addon-*` package are versioned and released independently (see
[CONTRIBUTING.md#releasing](./CONTRIBUTING.md#releasing)). Only the
**latest published version of each package** is supported with security
fixes; there are no maintained long-term-support branches.

## Reporting a Vulnerability

Please responsibly report suspected security vulnerabilities privately, not through a public
issue, using GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/jaenyf/time-provider/security)
   of this repository.
2. Click **Report a vulnerability**.
3. Include the affected package(s) and version(s), a description of the
   vulnerability and its impact, and steps to reproduce or a minimal
   example, if available.

This opens a private draft security advisory visible only to the
maintainers, so no report content or reporter contact details are exposed
publicly.

If confirmed, a fix will be prioritized and released as a patch version through the
normal release process, and credit will be given in the advisory and
release notes unless you'd prefer to stay anonymous.

Please do not open a public GitHub issue for a suspected security vulnerability until a fix has been released.
