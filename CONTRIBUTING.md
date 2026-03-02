# Contributing to @plotnerd/stat-engine

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/paradoxie/stat-engine.git
cd stat-engine
npm install
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run build` | Build ESM + CJS + type declarations |
| `npm run lint` | Type-check without emitting |

## Project Structure

```
src/
├── index.ts        # Public API entry point
├── engine.ts       # Core MultiAlgorithmEngine class
├── math-utils.ts   # Shared math functions (median, Kahan sum, etc.)
└── types.ts        # TypeScript type definitions

tests/
├── engine.test.ts      # Engine integration tests
└── math-utils.test.ts  # Math utility unit tests
```

## Making Changes

1. **Fork** the repository and create your branch from `main`
2. **Write tests** for any new functionality
3. **Run the test suite** to make sure everything passes: `npm test`
4. **Run the linter** to catch type errors: `npm run lint`
5. **Update documentation** if you changed any public APIs
6. **Submit a Pull Request** with a clear description

## Code Style

- Use TypeScript strict mode — no `any` types
- Add JSDoc comments to all public functions and types
- Use descriptive variable names over abbreviations
- Keep functions pure where possible (no side effects)
- Add `@internal` tag to functions not intended for public use

## Adding a New Algorithm

1. Add the algorithm identifier to `QuartileAlgorithm` in `types.ts`
2. Add metadata to `ALGORITHM_METADATA` in `engine.ts`
3. Implement the calculation method as a `private static` method
4. Add the case to the `switch` in `calculateQuartiles()`
5. Add verification support in `generateVerification()`
6. Write tests covering the new algorithm with known reference values
7. Update `README.md` with the new algorithm's details

## Reporting Bugs

Open a [GitHub Issue](https://github.com/paradoxie/stat-engine/issues) with:
- Your Node.js version and OS
- Minimal reproducible dataset
- Expected vs actual output
- Which algorithm(s) are affected

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
