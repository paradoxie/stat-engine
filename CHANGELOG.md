# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `variance` and `standardDeviation` fields in `StatisticalResults`
- `isSortedAscending()` utility function for array validation
- `calculateVariance()` and `calculateStdDev()` utility functions
- Input validation: reject `NaN`, `Infinity`, `-Infinity` in dataset
- `calculateMedian()` now throws on empty arrays instead of returning `NaN`
- `roundToPrecision()` validates decimal places parameter
- Comprehensive `math-utils.test.ts` with 30+ test cases
- `CONTRIBUTING.md` with development setup and PR guidelines
- `CHANGELOG.md` (this file)
- `.editorconfig` for consistent code style
- GitHub Issue and PR templates

### Fixed
- `tsconfig.json` — added `DOM` to `lib` for `performance.now()` type support
- `package.json` — corrected `repository.url` to match actual GitHub repo

## [1.0.5] - 2026-03-02

### Fixed
- Repository URL in `package.json` corrected for NPM provenance verification

## [1.0.4] - 2026-03-02

### Fixed
- CI publish job: added `environment` declaration for secret access

## [1.0.3] - 2026-03-02

### Fixed
- Added `DOM` to `tsconfig.json` lib to resolve `performance` type error in CI

## [1.0.1] - 2026-03-02

### Changed
- Enhanced README with downloads/bundle size/CI badges
- Added TypeScript type export examples and browser compatibility table
- Added yarn/pnpm/bun installation commands

## [1.0.0] - 2026-03-02

### Added
- Initial release of `@plotnerd/stat-engine`
- Five quartile algorithms: Tukey's Hinges, R-7/Python, Excel INC, Excel EXC, WolframAlpha
- `MultiAlgorithmEngine` class with static methods
- Algorithm comparison and smart recommendation
- Cross-verification code generation (R, Python, Excel, WolframAlpha)
- Kahan summation for numerical stability
- Full TypeScript support with ESM + CJS dual exports
- 26 test cases with Vitest
- GitHub Actions CI with multi-Node-version testing and automated NPM publishing

[Unreleased]: https://github.com/paradoxie/stat-engine/compare/v1.0.5...HEAD
[1.0.5]: https://github.com/paradoxie/stat-engine/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/paradoxie/stat-engine/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/paradoxie/stat-engine/compare/v1.0.1...v1.0.3
[1.0.1]: https://github.com/paradoxie/stat-engine/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/paradoxie/stat-engine/releases/tag/v1.0.0
