/**
 * @plotnerd/stat-engine
 *
 * Multi-algorithm quartile & statistics engine.
 * Powers https://plotnerd.com
 *
 * @packageDocumentation
 */

export { MultiAlgorithmEngine } from './engine';
export { StatEngineError, ValidationError, AlgorithmError } from './errors';
export {
    calculateMedian,
    roundToPrecision,
    kahanSum,
    isSortedAscending,
    calculateVariance,
    calculateStdDev,
    assertFiniteNumber,
} from './math-utils';
export type {
    QuartileAlgorithm,
    AlgorithmMetadata,
    StatisticalResults,
    MultiAlgorithmResults,
    AlgorithmComparison,
    VerificationOptions,
    VerificationResult,
    AlgorithmRecommendation,
    RecommendationContext,
} from './types';
