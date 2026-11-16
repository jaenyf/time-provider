import { defineConfig } from "vite-plus";
import { withCrapTypescriptVitest } from "@barney-media/crap-typescript-vitest";

export default withCrapTypescriptVitest(
  defineConfig({
    staged: {
      "*": "vp check --fix",
    },
    fmt: {
      ignorePatterns: [
        "coverage/**",
        "dist/**",
        "**/CHANGELOG.md",
        "**/.vitepress/cache/**",
        "packages/*/deno.json",
      ],
    },
    lint: {
      jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
      rules: { "vite-plus/prefer-vite-plus-imports": "error" },
      options: { typeAware: true, typeCheck: true },
      ignorePatterns: ["coverage/**", "dist/**", "**/.vitepress/cache/**"],
    },
    run: {
      cache: true,
    },
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      reporters: ["default", "junit"],
      outputFile: "test-report.junit.xml",
      include: ["packages/**/*.test.ts"],
      passWithNoTests: false,
      coverage: {
        provider: "v8",
        reporter: ["json", "text", "lcov"],
        clean: true,
        reportsDirectory: "coverage",
        exclude: ["index.ts", "**/test-shared/**", "**/test-e2e/**", "**/dist/**", "polyfills.ts"],
        thresholds: {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  }) as never,
  {
    format: "json",
    output: "reports/crap-report.json",
    threshold: 5.9,
    excludes: [
      // DueHeap hot path optimizations impact the CRAP score
      "packages/core/src/runtimes/deterministic/DueHeap.ts",
    ],
  },
);
