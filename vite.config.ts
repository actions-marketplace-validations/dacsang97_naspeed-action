import {defineConfig} from 'vite-plus';

export default defineConfig({
  fmt: {
    ignorePatterns: ['dist/**'],
    printWidth: 120,
    singleQuote: true,
    semi: true,
    trailingComma: 'none',
    bracketSpacing: false,
    arrowParens: 'avoid',
    sortPackageJson: true
  },
  lint: {
    ignorePatterns: ['dist/**'],
    options: {
      typeAware: true,
      typeCheck: true
    }
  },
  test: {
    include: ['__tests__/**/*.test.ts']
  },
  // The runner executes dist/index.js with no node_modules next to it, so every
  // dependency is bundled into that one file.
  pack: {
    entry: {index: 'src/main.ts'},
    format: 'esm',
    platform: 'node',
    target: 'node24',
    minify: true,
    deps: {alwaysBundle: [/.*/], onlyBundle: false},
    outExtensions: () => ({js: '.js'})
  }
});
