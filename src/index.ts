/**
 * @plotnerd/stat-engine
 *
 * Multi-algorithm quartile & statistics engine.
 * Powers https://plotnerd.com
 *
 * @packageDocumentation
 */

export { MultiAlgorithmEngine } from './engine';
export { calculateMedian, roundToPrecision, kahanSum } from './math-utils';
export type {
    QuartileAlgorithm,
    AlgorithmMetadata,
    StatisticalResults,
    MultiAlgorithmResults,
    AlgorithmComparison,
    VerificationOptions,
    VerificationResult,
    AlgorithmRecommendation,
} from './types';
