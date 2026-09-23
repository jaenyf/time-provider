# Contributing to Time-Provider

Thanks for your interest in contributing. This guide covers reporting bugs
and requesting features, the development setup, workflow, and quality
expectations.

## Reporting Bugs and Requesting Features

**Found a security vulnerability?** Don't open a public issue - see
[SECURITY.md](./SECURITY.md) for private reporting instead.

For anything else, check [open issues](https://github.com/jaenyf/time-provider/issues)
first to avoid filing a duplicate, then:

- **Bug report:** open a [Bug report](https://github.com/jaenyf/time-provider/issues/new?template=bug_report.yml).
  It asks for the affected package(s) and version, a minimal reproduction,
  expected vs. actual behavior, and your runtime (Node/Bun version or
  browser) - the more of that you can fill in, the faster it's actionable.
- **Feature request or new adapter idea:** open a
  [Feature request](https://github.com/jaenyf/time-provider/issues/new?template=feature_request.yml).
  Describe the problem you're trying to solve rather than just the API you
  have in mind - it's easier to evaluate and may already be solvable another
  way. Requesting a new date-library adapter, or a new addon, fits here too;
  see [ARCHITECTURE.md](./ARCHITECTURE.md) for what a plugin has to implement
  and how an addon attaches to a runtime, if you want to gauge the shape of
  the work yourself.
- **Something else, or neither template fits:** open a blank issue.

## Setup

Requires [Vite+](https://viteplus.dev/) (`vp`) installed and available in the PATH (including `vpx`).  
See the [installation guide](https://viteplus.dev/guide/), or install directly:

```bash
curl -fsSL https://vite.plus | bash   # macOS/Linux
irm https://vite.plus/ps1 | iex       # Windows (PowerShell)
```

_Note: Vite+ will automatically download the pinned package manager version (currently [Bun](https://bun.com/)) and a compatible [Node.js](https://nodejs.org/) runtime if they aren't already available on your system._

```bash
git clone https://github.com/jaenyf/time-provider.git
cd time-provider
vp install
```

## Development Commands

| Command                           | What it does                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `vp test`                         | Run all tests                                                                                       |
| `vp test --coverage`              | Run all tests with coverage (also runs in CI)                                                       |
| `vp run build`                    | Build every package                                                                                 |
| `vp check`                        | Format, lint, and type-check the current package                                                    |
| `vp run -r check`                 | Format, lint, and type-check every package                                                          |
| `node scripts/verify-packages.ts` | Pack every publishable package and check the tarball's contents and `exports` (needs a build first) |
| `vp run stryker`                  | Run mutation testing (Stryker)                                                                      |
| `vp run ready`                    | Run test, build, check, and stryker - the full local gate                                           |

Run a command for a single package from its directory, or use `vp run <pkg>#<script>`
from the repo root.

## Making Changes

1. Fork the repository and create a branch from `main`.
2. Name the branch `<type>/<description>`, where `<type>` is one of `bugfix`,
   `chore`, `ci`, `docs`, `feat`, `feature`, `fix`, `hotfix`, `perf`,
   `release`, `refactor` or `test` (see
   [conventionalbranch.org](https://conventionalbranch.org)). `ai` and
   `dependabot` are accepted too, but they belong to this repo's automated
   contributors. This is enforced by `validate-branch-name` (configured in
   the root `package.json`), both locally by the `pre-commit` hook
   (`.vite-hooks/pre-commit`) and again in CI.
3. Write or update tests for your change. New code is expected to keep
   coverage where it is; see [ARCHITECTURE.md](./ARCHITECTURE.md#testing) for
   how the test suites are organized.
4. Run the full local gate before pushing:
   ```bash
   vp run ready
   ```
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
   (e.g. `feat(plugin-luxon): ...`, `fix(core): ...`). This is enforced by
   commitlint, both as a local commit-msg hook and in CI, and the commit
   history drives automated versioning and the changelog (see
   [Releasing](#releasing)).
6. Open a pull request against `main`.

## Code Style

- **TypeScript, written as ESM.** Each package's source lives in its own
  `packages/<name>/src/`, and is published as both an ESM and a CJS build.
- **Formatting, linting, and type-checking** are all driven by `vp check`
  (per package) or `vp run -r check` (whole repo). Fix everything it
  reports; `vp check --fix` will auto-fix what it can, and the pre-commit
  hook already runs it on staged files.
- **`@time-provider/core` has zero runtime dependencies**, each plugin
  depends only on `core` and the date library it adapts, and each addon
  depends only on `core`. Don't add a new runtime dependency without a strong
  reason.

## Testing

We use [Vitest](https://vitest.dev/) via `vp test`.

- Every bug fix needs a regression test.
- A change to a plugin's runtime behavior should be added to the shared spec
  in `packages/test-shared` (run against every plugin) rather than to a
  single plugin's test file, unless the behavior is genuinely
  plugin-specific.
- A new plugin needs an entry in `packages/test` (unit-level, against
  source) and `packages/test-e2e` (a smoke test against the built `dist`
  output).
- A new addon needs its own suite under `packages/<addon>/test/` and a
  `packages/test-treeshake` fixture pair (`fixtures/with-<addon>-addon/`),
  proving each entry point pulls in only its own code. Behavior every plugin
  has to keep working once the addon is composed belongs in the shared spec,
  next to the cron addon's.

## Pull Request Guidelines

- Keep PRs focused. One change per PR.
- Write a clear title and description explaining what and why. The PR title
  is itself linted as a Conventional Commit, since a squash-merge uses it as
  the final commit message on `main`.
- Ensure CI passes: branch name, commit lint, build, check, test with
  coverage. See the `Check` workflow
  ([`.github/workflows/check.yml`](.github/workflows/check.yml)).

## Releasing

Releases are automated by [release-please](https://github.com/googleapis/release-please),
driven entirely by Conventional Commit messages on `main` - there is no
manual version bump or changelog edit.

1. Every commit merged to `main` is analyzed by release-please
   ([`.github/workflows/release-please.yml`](.github/workflows/release-please.yml)).
   Each package under `packages/*` is versioned and released independently
   (`release-please-config.json`), keeping an open "release PR" per package
   up to date with the next version number and changelog entry.
2. Merging a release PR triggers the changelog and `BENCHMARK.md`
   aggregation and a dry run of every released package's publish, to both
   npm and [JSR](https://jsr.io/@time-provider). Only once all of them pass
   does a per-package publish job run the package's `release` script. It
   stages the package on npm with `vp pm stage publish --provenance`, then
   publishes it to JSR with `deno publish`. Both authenticate through GitHub
   OIDC, so no registry token is stored in this repository.
3. A maintainer approves the staged version from npm (2FA required) before
   it becomes installable there. JSR has no staging, so the JSR version is
   live as soon as the publish job succeeds. If JSR fails after npm staged
   the version, reject it with `npm stage reject` so neither registry ships
   it.

`hotfix/*` branches follow the same pipeline against
`release-please-config.hotfix.json` instead, for versioning a fix
independently of whatever is queued on `main`.

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how the packages fit together:
the core abstractions, the plugin/adapter pattern, how an addon attaches its
facade to a runtime, why "full" and "UTC-only" plugins are separate interface
hierarchies, and how the test suites are organized.
