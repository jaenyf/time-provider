# AGENTS.md

Instructions for AI coding agents working in this repository. This is a
distillation for quick reference — [CONTRIBUTING.md](./CONTRIBUTING.md) and
[ARCHITECTURE.md](./ARCHITECTURE.md) are the fuller, human-oriented versions
and take precedence if anything here goes stale.

## Setup

Requires [Vite+](https://viteplus.dev/) (`vp`) installed and available in the PATH (including `vpx`).  
See the [installation guide](https://viteplus.dev/guide/), or install directly:

```bash
curl -fsSL https://vite.plus | bash   # macOS/Linux
irm https://vite.plus/ps1 | iex       # Windows (PowerShell)
```

[Deno](https://deno.com/) 2 is also needed for `vp run check` (and so `vp run ready`), which dry-runs
every package's JSR publish. See the [installation guide](https://docs.deno.com/runtime/getting_started/installation/).

Then, from the repo root:

```bash
vp install
```

This is a Bun workspace monorepo (`packages/*`, `website`, `tools/*`).

## Commands

| Command                           | What it does                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `vp test`                         | Run all tests                                                                                       |
| `vp test --coverage`              | Run all tests with coverage (matches CI)                                                            |
| `vp run build`                    | Build every package                                                                                 |
| `vp check`                        | Format, lint, and type-check the **current** package (run it from inside `packages/<name>/`)        |
| `vp run -r check`                 | Same, for every package, plus a JSR publish dry run of each publishable one (needs Deno)            |
| `node scripts/verify-packages.ts` | Pack every publishable package and check the tarball's contents and `exports` (needs a build first) |
| `vp run stryker`                  | Mutation testing (Stryker)                                                                          |
| `vp run ready`                    | Full local gate: build, check, test, stryker — run before considering a change done                 |
| `vp run <pkg>#<script>`           | Run one package's script from the repo root, e.g. `vp run @time-provider/core#build`                |

A package normally needs to be built (`vp run build`) before another package
that imports it (e.g. a plugin importing `@time-provider/core`) will
type-check or run, since workspace packages resolve through their built
`dist/` via `exports` in `package.json`.

## Conventions

- TypeScript, written as ESM. Each package's source lives in its own
  `packages/<name>/src/`, and is published as both an ESM and a CJS build.
- Conventional Commits, enforced by commitlint (commit-msg hook + CI), driving
  automated versioning and the changelog — e.g. `fix(core): ...`,
  `feat(plugin-luxon): ...`.
- Branch names matching `<type>/<description>` (`ai|bugfix|chore|ci|dependabot|docs|feat|feature|fix|hotfix|perf|release|refactor|test`),
  enforced by `validate-branch-name` in the pre-commit hook and CI.
- Every bug fix needs a regression test. A change to a plugin's _runtime
  behavior_ belongs in the shared spec (`packages/test-shared`, run against
  every plugin) rather than a single plugin's test file, unless the behavior
  is genuinely plugin-specific.
- A new plugin needs both a `packages/test` entry (unit-level, against
  source) and a `packages/test-e2e` entry (smoke test against the built
  `dist` output). A new addon needs its own suite under
  `packages/<addon>/test/` and a `packages/test-treeshake` fixture pair under
  `fixtures/with-<addon>-addon/`.
- `@time-provider/core` has zero runtime dependencies. Each plugin depends
  only on `core` and the one date library it adapts, declared as a
  `peerDependency` (never bundled as a `dependency`); each addon depends only
  on `core` — don't add a new runtime dependency without a strong reason.
- Packages under `packages/*` are versioned and released **independently**
  (see [SECURITY.md](./SECURITY.md)) — don't assume `core` and the plugins
  share a version number.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full picture: the core
abstractions (clock/timers/converter/timings), the plugin/adapter
pattern, how an addon attaches its facade to a runtime, why "full"
(timezone-aware) and "UTC-only" plugins are separate interface hierarchies,
and how the test suites are organized.

## Gotchas

- The pre-commit hook (`.vite-hooks/pre-commit`) runs `vp staged` then `vpx
validate-branch-name`. Both require the globally-installed `vp` toolchain
  from Setup above.
- Each plugin's `peerDependencies["@time-provider/core"]` range must be kept
  in sync with whatever `core` version the plugin actually requires.
