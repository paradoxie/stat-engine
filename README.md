# @plotnerd/stat-engine

[![npm version](https://img.shields.io/npm/v/@plotnerd/stat-engine.svg)](https://www.npmjs.com/package/@plotnerd/stat-engine)
[![license](https://img.shields.io/npm/l/@plotnerd/stat-engine.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Multi-algorithm quartile & statistics engine** — the calculation core behind [PlotNerd.com](https://plotnerd.com).

Calculate quartiles using **five different algorithms** in a single call. Compare results, get smart recommendations, and generate verification code for R, Python, Excel, and WolframAlpha.

## Why Five Algorithms?

Different tools calculate quartiles differently. The same dataset can produce **different Q1 and Q3 values** depending on the method:

| Algorithm | Compatible With | Method |
|-----------|----------------|--------|
| **Tukey's Hinges** | Statistics textbooks, manual calculation | Median splitting (exact values) |
| **R-7 / Python** | R `quantile(type=7)`, NumPy, SciPy, Google Sheets | Linear interpolation `h=(n-1)p+1` |
| **Excel INC** | Excel `QUARTILE.INC`, LibreOffice, WPS | Hyndman-Fan Type 7 |
| **Excel EXC** | Excel `QUARTILE.EXC` | Hyndman-Fan Type 6 `h=(n+1)p` |
| **WolframAlpha** | WolframAlpha, Mathematica, R `type=5` | R-5 interpolation `h=np+0.5` |

> 🔗 **See it in action**: [Interactive Algorithm Comparison on PlotNerd.com](https://plotnerd.com/algorithm-comparison)

## Install

```bash
npm install @plotnerd/stat-engine
```

## Quick Start

```ts
import { MultiAlgorithmEngine } from '@plotnerd/stat-engine';

// Calculate with all 5 algorithms at once
const data = [6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49];
const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);

// Access any algorithm's results
console.log(results.r_python_default.q1);     // 25.5
console.log(results.r_python_default.q3);     // 42.5
console.log(results.r_python_default.iqr);    // 17

// Full five-number summary
console.log(results.tukey_hinges.fiveNumberSummary);
// [6, 25.5, 40, 42.5, 49]
```

## API

### `MultiAlgorithmEngine.calculateAllAlgorithms(data)`

Calculate results using all five algorithms. Returns outliers, fences, IQR, mean, and five-number summary for each.

```ts
const results = MultiAlgorithmEngine.calculateAllAlgorithms([1, 2, 3, 4, 5, 6, 7, 8]);
// results.tukey_hinges, results.r_python_default, results.excel_inclusive, etc.
```

### `MultiAlgorithmEngine.calculateQuartiles(sortedData, algorithm)`

Calculate quartiles using a specific algorithm.

```ts
const sorted = [1, 2, 3, 4, 5, 6, 7, 8];
const { q1, median, q3 } = MultiAlgorithmEngine.calculateQuartiles(sorted, 'r_python_default');
```

### `MultiAlgorithmEngine.compareAlgorithms(results, baseAlgorithm?)`

Compare all algorithms against a baseline (default: `r_python_default`). Returns differences classified as `identical`, `minor`, `significant`, or `major`.

```ts
const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);
const comparisons = MultiAlgorithmEngine.compareAlgorithms(results);
comparisons.forEach(c => console.log(`${c.algorithm}: ${c.significance}`));
```

### `MultiAlgorithmEngine.recommendAlgorithm(data, context?)`

Get a smart recommendation based on data characteristics and user context.

```ts
const rec = MultiAlgorithmEngine.recommendAlgorithm(data, {
  userSoftware: 'Excel',   // → recommends excel_inclusive
  useCase: 'teaching',      // → recommends tukey_hinges
  experience: 'beginner'    // → recommends tukey_hinges
});
console.log(rec.recommended, rec.confidence); // 'excel_inclusive', 0.95
```

### `MultiAlgorithmEngine.generateVerification(options)`

Generate verification code and links for R, Python, Excel, or WolframAlpha.

```ts
const verify = MultiAlgorithmEngine.generateVerification({
  algorithm: 'wolfram_alpha',
  data: [1, 2, 3, 4, 5]
});
console.log(verify.verificationUrl);  // WolframAlpha link
console.log(verify.verificationCode); // Copy-paste code
```

## Utility Functions

```ts
import { calculateMedian, kahanSum, roundToPrecision } from '@plotnerd/stat-engine';

calculateMedian([1, 2, 3, 4, 5]);     // 3
kahanSum([0.1, 0.2, 0.3]);            // 0.6 (compensated)
roundToPrecision(3.14159, 2);          // 3.14
```

## Used By

- **[PlotNerd.com](https://plotnerd.com)** — Professional quartile calculator & box plot creator

## Algorithm Details

For a deep dive into how each algorithm works and when to use which, check out:

- 📊 [Quartile Methods Compared](https://plotnerd.com/blog/quartile-methods-compared) — Side-by-side analysis
- 📖 [Tukey vs R-7: Which Method Should You Use?](https://plotnerd.com/blog/tukey-vs-r7) — In-depth comparison
- 🧮 [Interactive Quartile Guide](https://plotnerd.com/labs/interactive-quartile-guide) — Try it yourself

## License

MIT © [PlotNerd Team](https://plotnerd.com)
