import type {
    QuartileAlgorithm,
    AlgorithmMetadata,
    MultiAlgorithmResults,
    AlgorithmComparison,
    VerificationOptions,
    VerificationResult,
    AlgorithmRecommendation,
    RecommendationContext,
    StatisticalResults
} from './types';
import { calculateMedian, kahanSum, isSortedAscending, calculateVariance, calculateStdDev, roundToPrecision, assertFiniteNumber } from './math-utils';
import { ValidationError, AlgorithmError } from './errors';

/**
 * PlotNerd Multi-Algorithm Calculation Engine V2.2
 *
 * Implements five mainstream quartile calculation methods with complete
 * verification and comparison functionality.
 *
 * Algorithms supported:
 * - **Tukey's Hinges** — Classic textbook method
 * - **R-7 / Python NumPy** — Universal standard for data science
 * - **Excel QUARTILE.INC** — Hyndman-Fan Type 7
 * - **Excel QUARTILE.EXC** — Hyndman-Fan Type 6
 * - **WolframAlpha / R-5** — Hydrological interpolation
 *
 * @example
 * ```ts
 * import { MultiAlgorithmEngine } from '@plotnerd/stat-engine';
 *
 * const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);
 * console.log(results.r_python_default.q1); // 3.25
 * console.log(results.r_python_default.q3); // 7.75
 * ```
 *
 * @see https://plotnerd.com — Live demo and interactive calculator
 */
export class MultiAlgorithmEngine {

    // ─── Named constants (defaults) ──────────────────────────────────────

    /** Minimum number of data points required for quartile calculation. */
    private static readonly MIN_DATA_POINTS = 4;

    /** Standard IQR multiplier for Tukey fences (1.5×IQR). */
    private static readonly DEFAULT_FENCE_MULTIPLIER = 1.5;

    /** Default decimal precision for rounding output values. */
    private static readonly DEFAULT_PRECISION = 4;

    /** Threshold below which algorithm differences are considered identical. */
    private static readonly DIFF_THRESHOLD_IDENTICAL = 0.001;

    /** Threshold below which differences are considered minor (vs significant). */
    private static readonly DIFF_THRESHOLD_MINOR = 0.1;

    /** Threshold below which differences are considered significant (vs major). */
    private static readonly DIFF_THRESHOLD_SIGNIFICANT = 1.0;

    // ─── Instance-level configuration ────────────────────────────────────

    /** Output decimal precision for this instance. */
    readonly precision: number;

    /** IQR fence multiplier for outlier detection for this instance. */
    readonly fenceMultiplier: number;

    /**
     * Create a configured engine instance.
     *
     * @param options - Optional configuration overrides.
     * @param options.precision - Decimal places for rounding (default: 4).
     * @param options.fenceMultiplier - IQR multiplier for outlier fences (default: 1.5).
     *
     * @example
     * ```ts
     * // Default behaviour (same as static methods)
     * const engine = new MultiAlgorithmEngine();
     *
     * // Custom precision & 3×IQR extreme outlier detection
     * const custom = new MultiAlgorithmEngine({ precision: 6, fenceMultiplier: 3 });
     * const results = custom.calculate([1, 2, 3, 4, 5, 6, 7, 8]);
     * ```
     */
    constructor(options?: { precision?: number; fenceMultiplier?: number }) {
        const precision = options?.precision ?? MultiAlgorithmEngine.DEFAULT_PRECISION;
        const fence = options?.fenceMultiplier ?? MultiAlgorithmEngine.DEFAULT_FENCE_MULTIPLIER;

        if (!Number.isInteger(precision) || precision < 0 || precision > 15) {
            throw new ValidationError(
                `precision must be an integer between 0 and 15, got: ${precision}`,
                'precision'
            );
        }
        if (typeof fence !== 'number' || !Number.isFinite(fence) || fence <= 0) {
            throw new ValidationError(
                `fenceMultiplier must be a positive finite number, got: ${fence}`,
                'fenceMultiplier'
            );
        }

        this.precision = precision;
        this.fenceMultiplier = fence;
    }

    /**
     * Instance method: calculate all algorithms with this engine's configuration.
     *
     * @param numbers - Raw numeric data (unsorted is fine).
     * @returns Results keyed by algorithm name.
     */
    calculate(numbers: number[]): MultiAlgorithmResults {
        return MultiAlgorithmEngine._calculateAllAlgorithms(
            numbers,
            this.precision,
            this.fenceMultiplier
        );
    }

    // ─── Algorithm metadata ──────────────────────────────────────────────
    private static readonly ALGORITHM_METADATA: Record<QuartileAlgorithm, AlgorithmMetadata> = {
        tukey_hinges: {
            id: 'tukey_hinges',
            name: 'Textbook Method (Tukey\'s Hinges)',
            description: 'Median-splitting method (inclusive median for odd n). Halves may produce interpolated values.',
            category: 'academic',
            compatibleWith: ['Statistics Textbooks', 'Alcula Calculator', 'Manual Calculation'],
            verificationSource: 'Alcula Five Number Summary',
            verificationMethod: 'Manual calculation verification',
            precision: 'interpolated',
            complexity: 'low'
        },
        r_python_default: {
            id: 'r_python_default',
            name: 'Universal Standard (R, Python, Google Sheets)',
            description: 'Linear interpolation method, default standard for modern data science software',
            category: 'statistical',
            compatibleWith: ['R (type=7)', 'Python NumPy', 'Google Sheets QUARTILE.INC', 'SciPy'],
            verificationSource: 'R quantile() function',
            verificationMethod: 'quantile(data, c(0.25, 0.75), type=7)',
            precision: 'interpolated',
            complexity: 'medium'
        },
        excel_inclusive: {
            id: 'excel_inclusive',
            name: 'Excel Compatible Mode (QUARTILE.INC)',
            description: 'Excel QUARTILE.INC / PERCENTILE.INC compatible method (Type 7 / R-7)',
            category: 'software',
            compatibleWith: ['Microsoft Excel QUARTILE.INC', 'Google Sheets QUARTILE.INC', 'LibreOffice Calc', 'WPS Office'],
            verificationSource: 'Microsoft Excel',
            verificationMethod: '=QUARTILE.INC() function',
            precision: 'interpolated',
            complexity: 'medium'
        },
        excel_exclusive: {
            id: 'excel_exclusive',
            name: 'Excel Compatible Mode (QUARTILE.EXC)',
            description: 'Excel QUARTILE.EXC / PERCENTILE.EXC compatible method (Type 6)',
            category: 'software',
            compatibleWith: ['Microsoft Excel QUARTILE.EXC', 'Google Sheets QUARTILE.EXC', 'LibreOffice Calc', 'WPS Office'],
            verificationSource: 'Microsoft Excel',
            verificationMethod: '=QUARTILE.EXC() function',
            precision: 'interpolated',
            complexity: 'medium'
        },
        wolfram_alpha: {
            id: 'wolfram_alpha',
            name: 'WolframAlpha Compatible Mode',
            description: 'Hydrological interpolation based on R-5 method, compatible with WolframAlpha and Mathematica',
            category: 'statistical',
            compatibleWith: ['WolframAlpha', 'Mathematica', 'R (type=5)'],
            verificationSource: 'WolframAlpha',
            verificationMethod: 'quartiles of {data}',
            precision: 'interpolated',
            complexity: 'medium'
        }
    };

    /**
     * Get metadata for a specific algorithm.
     */
    static getAlgorithmMetadata(algorithm: QuartileAlgorithm): Readonly<AlgorithmMetadata> {
        const meta = this.ALGORITHM_METADATA[algorithm];
        return Object.freeze({ ...meta, compatibleWith: Object.freeze([...meta.compatibleWith]) });
    }

    /**
     * Get metadata for all available algorithms.
     * Returns frozen copies to prevent mutation of internal state.
     */
    static getAvailableAlgorithms(): ReadonlyArray<Readonly<AlgorithmMetadata>> {
        return Object.freeze(
            Object.values(this.ALGORITHM_METADATA).map(meta =>
                Object.freeze({ ...meta, compatibleWith: Object.freeze([...meta.compatibleWith]) })
            )
        );
    }

    /**
     * Calculate quartiles using a specified algorithm.
     *
     * @param sortedData - Pre-sorted numeric array (ascending).
     * @param algorithm - Which algorithm to use.
     * @returns Object with q1, median, and q3 values.
     * @throws If `sortedData` is empty.
     */
    static calculateQuartiles(
        sortedData: number[],
        algorithm: QuartileAlgorithm
    ): { q1: number; median: number; q3: number } {

        if (!Array.isArray(sortedData)) {
            throw new ValidationError('sortedData must be an array of numbers', 'sortedData');
        }

        if (sortedData.length === 0) {
            throw new ValidationError('Cannot calculate quartiles for empty dataset', 'sortedData');
        }

        // Validate every element is a finite number (catches NaN, Infinity, strings, etc.)
        for (let i = 0; i < sortedData.length; i++) {
            assertFiniteNumber(sortedData[i], `index ${i}`);
        }

        if (!isSortedAscending(sortedData)) {
            throw new ValidationError(
                'Data must be sorted in ascending order. Use [...data].sort((a, b) => a - b) first.',
                'sortedData'
            );
        }

        const n = sortedData.length;

        // Special case where all values are identical
        const range = sortedData[n - 1] - sortedData[0];
        if (range === 0) {
            const value = sortedData[0];
            return { q1: value, median: value, q3: value };
        }

        // Calculate median (same for all algorithms)
        const median = calculateMedian(sortedData);

        // Calculate Q1 and Q3 based on algorithm
        switch (algorithm) {
            case 'tukey_hinges':
                return this.calculateTukeyHinges(sortedData, median);
            case 'r_python_default':
                return this.calculateR7Method(sortedData, median);
            case 'excel_inclusive':
                return this.calculateExcelInclusive(sortedData, median);
            case 'excel_exclusive':
                return this.calculateExcelExclusive(sortedData, median);
            case 'wolfram_alpha':
                return this.calculateWolframAlpha(sortedData, median);
            default:
                throw new ValidationError(`Unsupported algorithm: ${algorithm}`, 'algorithm');
        }
    }

    /**
     * Internal unchecked quartile calculation — skips validation for
     * data that has already been validated and sorted by
     * `_calculateAllAlgorithms`. This avoids redundant O(n) checks
     * on each of the 5 algorithm iterations.
     *
     * @internal
     */
    private static _calculateQuartilesUnchecked(
        sortedData: number[],
        algorithm: QuartileAlgorithm
    ): { q1: number; median: number; q3: number } {
        const n = sortedData.length;
        const range = sortedData[n - 1] - sortedData[0];
        if (range === 0) {
            const value = sortedData[0];
            return { q1: value, median: value, q3: value };
        }

        const median = calculateMedian(sortedData);

        switch (algorithm) {
            case 'tukey_hinges':
                return this.calculateTukeyHinges(sortedData, median);
            case 'r_python_default':
                return this.calculateR7Method(sortedData, median);
            case 'excel_inclusive':
                return this.calculateExcelInclusive(sortedData, median);
            case 'excel_exclusive':
                return this.calculateExcelExclusive(sortedData, median);
            case 'wolfram_alpha':
                return this.calculateWolframAlpha(sortedData, median);
            default:
                throw new ValidationError(`Unsupported algorithm: ${algorithm}`, 'algorithm');
        }
    }

    /**
     * Tukey's Hinges algorithm (textbook method).
     */
    private static calculateTukeyHinges(
        sortedData: number[],
        median: number
    ): { q1: number; median: number; q3: number } {
        const n = sortedData.length;

        let lowerHalf: number[];
        let upperHalf: number[];

        if (n % 2 === 0) {
            lowerHalf = sortedData.slice(0, n / 2);
            upperHalf = sortedData.slice(n / 2);
        } else {
            // Odd number of data points, median included in both halves
            const midIndex = Math.floor(n / 2);
            lowerHalf = sortedData.slice(0, midIndex + 1);
            upperHalf = sortedData.slice(midIndex);
        }

        const q1 = calculateMedian(lowerHalf);
        const q3 = calculateMedian(upperHalf);

        return { q1, median, q3 };
    }

    /**
     * R-7 method (universal standard).
     * Index formula: h = (n-1) * p + 1
     */
    private static calculateR7Method(
        sortedData: number[],
        median: number
    ): { q1: number; median: number; q3: number } {
        const q1 = this.interpolateR7(sortedData, 0.25);
        const q3 = this.interpolateR7(sortedData, 0.75);

        return { q1, median, q3 };
    }

    /**
     * R-7 linear interpolation: h = (n-1)*p + 1
     *
     * Boundary clamping (`i < 0` / `i >= n-1`) is a defensive safety net.
     * For valid percentiles in [0, 1] with n ≥ 1, the index always falls
     * within bounds. The guards exist purely as mathematical insurance
     * against floating-point drift or unexpected caller inputs.
     */
    private static interpolateR7(sortedData: number[], percentile: number): number {
        const n = sortedData.length;
        const h = (n - 1) * percentile + 1;
        const i = Math.floor(h) - 1;
        const f = h - Math.floor(h);

        if (i < 0) return sortedData[0];
        if (i >= n - 1) return sortedData[n - 1];

        return sortedData[i] + f * (sortedData[i + 1] - sortedData[i]);
    }

    /**
     * Excel compatible mode (QUARTILE.INC / PERCENTILE.INC).
     *
     * Uses the same index rule as Hyndman-Fan Type 7 / R type=7:
     * h = (n - 1) * p + 1
     *
     * Delegates to {@link calculateR7Method} — both implement
     * Hyndman-Fan Type 7 interpolation. Kept as a separate entry point
     * for semantic clarity in the switch dispatch.
     */
    private static calculateExcelInclusive(
        sortedData: number[],
        median: number
    ): { q1: number; median: number; q3: number } {
        return this.calculateR7Method(sortedData, median);
    }

    /**
     * Excel compatible mode (QUARTILE.EXC / PERCENTILE.EXC).
     *
     * Corresponds to Hyndman-Fan Type 6 style indexing:
     * h = (n + 1) * p
     */
    private static calculateExcelExclusive(
        sortedData: number[],
        median: number
    ): { q1: number; median: number; q3: number } {
        const q1 = this.interpolateExcelExclusive(sortedData, 0.25);
        const q3 = this.interpolateExcelExclusive(sortedData, 0.75);

        return { q1, median, q3 };
    }

    /**
     * Excel QUARTILE.EXC interpolation: h = (n+1)*p
     *
     * Boundary clamping is a defensive safety net — for valid percentiles
     * in [0, 1] with n ≥ 1, the index always falls within bounds.
     */
    private static interpolateExcelExclusive(sortedData: number[], percentile: number): number {
        const n = sortedData.length;
        const h = (n + 1) * percentile;
        const i = Math.floor(h) - 1;
        const f = h - Math.floor(h);

        if (i < 0) return sortedData[0];
        if (i >= n - 1) return sortedData[n - 1];

        if (f === 0) {
            return sortedData[i];
        }

        return sortedData[i] + f * (sortedData[i + 1] - sortedData[i]);
    }

    /**
     * WolframAlpha compatible mode (R-5 method).
     * Index formula: h = n * p + 0.5
     */
    private static calculateWolframAlpha(
        sortedData: number[],
        median: number
    ): { q1: number; median: number; q3: number } {
        const q1 = this.interpolateR5(sortedData, 0.25);
        const q3 = this.interpolateR5(sortedData, 0.75);

        return { q1, median, q3 };
    }

    /**
     * R-5 (Hydrology) interpolation: h = n*p + 0.5
     *
     * Boundary clamping is a defensive safety net — for valid percentiles
     * in [0, 1] with n ≥ 1, the index always falls within bounds.
     */
    private static interpolateR5(sortedData: number[], percentile: number): number {
        const n = sortedData.length;
        const h = n * percentile + 0.5;
        const i = Math.floor(h) - 1;
        const f = h - Math.floor(h);

        if (i < 0) return sortedData[0];
        if (i >= n - 1) return sortedData[n - 1];

        return sortedData[i] + f * (sortedData[i + 1] - sortedData[i]);
    }

    /**
     * Calculate results using all five algorithms at once.
     *
     * @param numbers - Raw numeric data (unsorted is fine).
     * @returns Results keyed by algorithm name.
     * @throws If fewer than 4 data points are provided.
     *
     * @example
     * ```ts
     * const results = MultiAlgorithmEngine.calculateAllAlgorithms([4, 7, 1, 3, 9, 2, 8]);
     * console.log(results.tukey_hinges.q1);      // 2
     * console.log(results.r_python_default.q1);   // 2.5
     * ```
     */
    static calculateAllAlgorithms(numbers: number[]): MultiAlgorithmResults {
        return this._calculateAllAlgorithms(
            numbers,
            this.DEFAULT_PRECISION,
            this.DEFAULT_FENCE_MULTIPLIER
        );
    }

    /**
     * Internal implementation shared by static and instance methods.
     */
    private static _calculateAllAlgorithms(
        numbers: number[],
        precision: number,
        fenceMultiplier: number
    ): MultiAlgorithmResults {
        if (!Array.isArray(numbers) || numbers.length < this.MIN_DATA_POINTS) {
            throw new ValidationError(
                `At least ${this.MIN_DATA_POINTS} data points required for quartile calculation`,
                'data'
            );
        }

        // Validate all values are finite numbers (typeof + Number.isFinite double guard)
        for (let i = 0; i < numbers.length; i++) {
            assertFiniteNumber(numbers[i], `index ${i}`);
        }

        const sortedData = [...numbers].sort((a, b) => a - b);

        const minimum = sortedData[0];
        const maximum = sortedData[sortedData.length - 1];
        const count = numbers.length;
        const sum = kahanSum(numbers);
        const mean = sum / count;
        const dataRange = maximum - minimum;
        const variance = calculateVariance(numbers, mean);
        const standardDeviation = calculateStdDev(numbers, mean);

        // Guard against overflow: sum/mean/variance can exceed Number.MAX_VALUE for extreme data
        if (!Number.isFinite(sum) || !Number.isFinite(mean) || !Number.isFinite(variance)) {
            throw new ValidationError(
                'Numeric overflow: data values are too large for safe computation. ' +
                'Consider normalizing or scaling your data before analysis.',
                'data'
            );
        }

        const results: Partial<MultiAlgorithmResults> = {};

        for (const algorithm of Object.keys(this.ALGORITHM_METADATA) as QuartileAlgorithm[]) {
            // performance.now() is available in Node 16+ and all target browsers.
            // Using a consistent high-resolution timer avoids unit mismatch.
            const startTime = performance.now();

            try {
                const { q1, median, q3 } = this._calculateQuartilesUnchecked(sortedData, algorithm);
                const iqr = q3 - q1;

                const lowerFence = q1 - fenceMultiplier * iqr;
                const upperFence = q3 + fenceMultiplier * iqr;
                const outliers: number[] = [];
                const outlierIndices: number[] = [];

                numbers.forEach((value, index) => {
                    if (value < lowerFence || value > upperFence) {
                        outliers.push(value);
                        outlierIndices.push(index);
                    }
                });

                const round = (num: number): number => roundToPrecision(num, precision);

                results[algorithm] = {
                    minimum: round(minimum),
                    maximum: round(maximum),
                    count,
                    sum: round(sum),
                    q1: round(q1),
                    median: round(median),
                    q3: round(q3),
                    iqr: round(iqr),
                    fiveNumberSummary: [
                        round(minimum),
                        round(q1),
                        round(median),
                        round(q3),
                        round(maximum)
                    ],
                    outliers: outliers.map(round),
                    outlierIndices,
                    lowerFence: round(lowerFence),
                    upperFence: round(upperFence),
                    variance: round(variance),
                    standardDeviation: round(standardDeviation),
                    calculationTime: performance.now() - startTime,
                    dataRange: round(dataRange),
                    mean: round(mean)
                };

            } catch (error) {
                if (error instanceof ValidationError) throw error;
                throw new AlgorithmError(
                    `Algorithm ${algorithm} calculation failed: ${error instanceof Error ? error.message : String(error)}`,
                    algorithm
                );
            }
        }

        // Runtime completeness check: verify all 5 algorithms are populated
        const expectedAlgorithms = Object.keys(this.ALGORITHM_METADATA) as QuartileAlgorithm[];
        for (const alg of expectedAlgorithms) {
            if (!results[alg]) {
                throw new AlgorithmError(
                    `Algorithm '${alg}' result missing after calculation`,
                    alg
                );
            }
        }

        return results as MultiAlgorithmResults;
    }

    /**
     * Compare results from different algorithms against a base algorithm.
     *
     * @param results - Results from `calculateAllAlgorithms()`.
     * @param baseAlgorithm - Algorithm to compare against (default: `r_python_default`).
     * @returns Sorted comparisons from most to least similar.
     */
    static compareAlgorithms(
        results: MultiAlgorithmResults,
        baseAlgorithm: QuartileAlgorithm = 'r_python_default'
    ): AlgorithmComparison[] {
        if (!results || typeof results !== 'object') {
            throw new ValidationError(
                'results must be a valid MultiAlgorithmResults object',
                'results'
            );
        }

        const baseResult = results[baseAlgorithm];
        if (!baseResult || typeof baseResult.q1 !== 'number' || typeof baseResult.q3 !== 'number' || typeof baseResult.iqr !== 'number') {
            throw new ValidationError(
                `Base algorithm '${baseAlgorithm}' not found or incomplete in results. Ensure results come from calculateAllAlgorithms().`,
                'baseAlgorithm'
            );
        }

        const knownAlgorithms = new Set<string>(Object.keys(this.ALGORITHM_METADATA));
        const comparisons: AlgorithmComparison[] = [];

        for (const [algorithm, result] of Object.entries(results) as [QuartileAlgorithm, StatisticalResults][]) {
            // Skip unknown algorithm keys to enforce QuartileAlgorithm contract
            if (!knownAlgorithms.has(algorithm)) continue;

            if (!result || typeof result.q1 !== 'number' || typeof result.q3 !== 'number' || typeof result.iqr !== 'number') {
                throw new ValidationError(
                    `Algorithm '${algorithm}' result is missing or has incomplete q1/q3/iqr fields.`,
                    'results'
                );
            }

            const q1_diff = Math.abs(result.q1 - baseResult.q1);
            const q3_diff = Math.abs(result.q3 - baseResult.q3);
            const iqr_diff = Math.abs(result.iqr - baseResult.iqr);

            const maxDiff = Math.max(q1_diff, q3_diff, iqr_diff);
            let significance: AlgorithmComparison['significance'];

            if (maxDiff < this.DIFF_THRESHOLD_IDENTICAL) {
                significance = 'identical';
            } else if (maxDiff < this.DIFF_THRESHOLD_MINOR) {
                significance = 'minor';
            } else if (maxDiff < this.DIFF_THRESHOLD_SIGNIFICANT) {
                significance = 'significant';
            } else {
                significance = 'major';
            }

            comparisons.push({
                algorithm,
                results: result,
                differences: { q1_diff, q3_diff, iqr_diff },
                significance
            });
        }

        return comparisons.sort((a, b) => {
            const significance_order = ['identical', 'minor', 'significant', 'major'];
            const primary = significance_order.indexOf(a.significance) - significance_order.indexOf(b.significance);
            if (primary !== 0) return primary;
            // Secondary: within same significance tier, sort by total diff ascending
            const totalA = a.differences.q1_diff + a.differences.q3_diff + a.differences.iqr_diff;
            const totalB = b.differences.q1_diff + b.differences.q3_diff + b.differences.iqr_diff;
            return totalA - totalB;
        });
    }

    /**
     * Generate verification links and code for a specific algorithm.
     *
     * @param options - Verification options including algorithm and data.
     * @returns Verification URLs, code snippets, and step-by-step instructions.
     */
    static generateVerification(options: VerificationOptions): VerificationResult {
        if (!options || typeof options !== 'object') {
            throw new ValidationError(
                'options must be a valid VerificationOptions object',
                'options'
            );
        }

        const { algorithm, data, includeSteps = true, includeCode = true } = options;

        if (!Array.isArray(data) || data.length === 0) {
            throw new ValidationError('Verification requires a non-empty data array', 'data');
        }

        // Validate all values are finite numbers
        for (let i = 0; i < data.length; i++) {
            assertFiniteNumber(data[i], `index ${i}`);
        }

        let verificationUrl = '';
        let verificationCode = '';
        let instructions: string[] = [];

        const sortedData = [...data].sort((a, b) => a - b);
        const expectedResults = this.calculateQuartiles(sortedData, algorithm);

        switch (algorithm) {
            case 'wolfram_alpha': {
                const dataString = data.join(', ');
                verificationUrl = `https://www.wolframalpha.com/input/?i=${encodeURIComponent(`quartiles of {${dataString}}`)}`;
                verificationCode = `WolframAlpha query: quartiles of {${dataString}}`;
                instructions = [
                    '1. Click the link above to visit WolframAlpha',
                    '2. Check the quartile values in the "Results" section',
                    '3. Compare Q1, Q2, Q3 calculation results',
                    '4. Note that WolframAlpha displays format as {Q1, Q2, Q3}'
                ];
                break;
            }

            case 'r_python_default':
                verificationCode = `# R verification\ndata <- c(${data.join(', ')})\nquantile(data, c(0.25, 0.5, 0.75), type=7)\n\n# Python verification\nimport numpy as np\ndata = [${data.join(', ')}]\nnp.percentile(data, [25, 50, 75], method='linear')`;
                instructions = [
                    '1. Copy the code above to R or Python environment',
                    '2. Run the code to view quartile results',
                    '3. In R, type=7 corresponds to linear interpolation',
                    '4. In Python, method="linear" is the default method'
                ];
                break;

            case 'excel_inclusive':
                verificationCode = `=QUARTILE.INC(A1:A${data.length}, 1)  // Q1\n=QUARTILE.INC(A1:A${data.length}, 2)  // Q2\n=QUARTILE.INC(A1:A${data.length}, 3)  // Q3`;
                instructions = [
                    '1. Paste data into Excel cells A1:A' + data.length,
                    '2. Enter the formulas above in blank cells',
                    '3. Use QUARTILE.INC function to calculate quartiles',
                    '4. Compare calculation results with PlotNerd output'
                ];
                break;

            case 'excel_exclusive':
                verificationCode = `=QUARTILE.EXC(A1:A${data.length}, 1)  // Q1\n=QUARTILE.EXC(A1:A${data.length}, 2)  // Q2\n=QUARTILE.EXC(A1:A${data.length}, 3)  // Q3`;
                instructions = [
                    '1. Paste data into Excel cells A1:A' + data.length,
                    '2. Enter the formulas above in blank cells',
                    '3. Use QUARTILE.EXC function to calculate quartiles',
                    '4. Compare calculation results with PlotNerd output'
                ];
                break;

            case 'tukey_hinges':
                verificationCode = `// Manual calculation steps\nData: [${data.join(', ')}]\nAfter sorting: [${sortedData.join(', ')}]\nTotal: ${data.length}\nMedian: ${expectedResults.median}\nQ1 (lower half median): ${expectedResults.q1}\nQ3 (upper half median): ${expectedResults.q3}`;
                instructions = [
                    '1. Sort data from smallest to largest',
                    '2. Find the overall median',
                    '3. Split data into upper and lower halves (for odd numbers, median is included in both parts)',
                    '4. Calculate the median of each half as Q1 and Q3'
                ];
                break;
        }

        return {
            algorithm,
            verificationUrl,
            verificationCode: includeCode ? verificationCode : '',
            expectedResults,
            instructions: includeSteps ? instructions : []
        };
    }

    /**
     * Get an intelligent algorithm recommendation based on data characteristics
     * and user context (software, use case, experience level).
     *
     * @param data - The dataset to analyze.
     * @param context - Optional context for smarter recommendations.
     * @returns Recommended algorithm with confidence score and alternatives.
     */
    static recommendAlgorithm(data: number[], context?: RecommendationContext): AlgorithmRecommendation {

        if (!Array.isArray(data) || data.length === 0) {
            throw new ValidationError('Recommendation requires a non-empty data array', 'data');
        }

        // Validate all values are finite numbers (consistent with other public APIs)
        for (let i = 0; i < data.length; i++) {
            assertFiniteNumber(data[i], `index ${i}`);
        }

        const n = data.length;
        const hasRepeats = new Set(data).size < data.length;

        if (context?.userSoftware !== undefined) {
            if (typeof context.userSoftware !== 'string') {
                throw new ValidationError(
                    `userSoftware must be a string, got: ${typeof context.userSoftware}`,
                    'userSoftware'
                );
            }
            const software = context.userSoftware.toLowerCase();

            const isExcelOrSheets = /\bexcel\b|\bgoogle\s+sheets\b|\bsheets\b/.test(software);
            const isWolframOrMathematica = /\bwolfram(?:alpha)?\b|\bmathematica\b/.test(software);
            const isRPythonEcosystem = /\br\b|\brstudio\b|\bpython(?:\d+(?:\.\d+)*)?\b|\bnumpy\b|\bscipy\b|\bpandas\b/.test(software);

            if (isExcelOrSheets) {
                return {
                    recommended: 'excel_inclusive',
                    reason: 'Fully compatible with Excel/Google Sheets QUARTILE.INC function',
                    confidence: 0.95,
                    alternatives: [
                        { algorithm: 'excel_exclusive', reason: 'If using QUARTILE.EXC / PERCENTILE.EXC' }
                    ]
                };
            }

            if (isWolframOrMathematica) {
                return {
                    recommended: 'wolfram_alpha',
                    reason: 'Consistent with WolframAlpha and Mathematica calculation results',
                    confidence: 0.95,
                    alternatives: [
                        { algorithm: 'r_python_default', reason: 'If standard statistical software compatibility is needed' }
                    ]
                };
            }

            if (isRPythonEcosystem) {
                return {
                    recommended: 'r_python_default',
                    reason: 'Consistent with default quartile calculation methods in R and Python',
                    confidence: 0.95,
                    alternatives: [
                        { algorithm: 'wolfram_alpha', reason: 'If Mathematica compatibility is needed' }
                    ]
                };
            }
        }

        if (context?.useCase !== undefined) {
            if (typeof context.useCase !== 'string') {
                throw new ValidationError(
                    `useCase must be a string, got: ${typeof context.useCase}`,
                    'useCase'
                );
            }
            const useCase = context.useCase.toLowerCase();

            if (useCase.includes('learning') || useCase.includes('teaching') || useCase.includes('course') || useCase.includes('education')) {
                return {
                    recommended: 'tukey_hinges',
                    reason: 'Textbook standard method, easy to understand and manually verify',
                    confidence: 0.85,
                    alternatives: [
                        { algorithm: 'r_python_default', reason: 'If integration with modern software is needed' }
                    ]
                };
            }
        }

        if (context?.experience === 'beginner') {
            return {
                recommended: 'tukey_hinges',
                reason: 'Most understandable classic method, results are always values from original data',
                confidence: 0.8,
                alternatives: [
                    { algorithm: 'excel_inclusive', reason: 'If familiar with Excel operations' }
                ]
            };
        }

        if (hasRepeats && n < 20) {
            return {
                recommended: 'tukey_hinges',
                reason: 'Classic method is more stable for small datasets with duplicate values',
                confidence: 0.75,
                alternatives: [
                    { algorithm: 'r_python_default', reason: 'Standard statistical method' }
                ]
            };
        }

        return {
            recommended: 'r_python_default',
            reason: 'Standard method for modern data science, widest compatibility',
            confidence: 0.7,
            alternatives: [
                { algorithm: 'excel_inclusive', reason: 'If primarily using Excel for data processing' },
                { algorithm: 'wolfram_alpha', reason: 'If high-precision mathematical calculations are needed' }
            ]
        };
    }
}
