import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["coverage/**", "dist/**", "**/CHANGELOG.md"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ["coverage/**", "dist/**"],
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
      reporter: ["text", "lcov"],
      clean: true,
      reportsDirectory: "coverage",
      exclude: ["index.ts", "**/test-shared/**", "**/dist/**"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
