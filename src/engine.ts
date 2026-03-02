import type {
    QuartileAlgorithm,
    AlgorithmMetadata,
    MultiAlgorithmResults,
    AlgorithmComparison,
    VerificationOptions,
    VerificationResult,
    AlgorithmRecommendation,
    StatisticalResults
} from './types';
import { calculateMedian, kahanSum, isSortedAscending, calculateVariance, calculateStdDev } from './math-utils';

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

    // Algorithm metadata configuration
    private static readonly ALGORITHM_METADATA: Record<QuartileAlgorithm, AlgorithmMetadata> = {
        tukey_hinges: {
            id: 'tukey_hinges',
            name: 'Textbook Method (Tukey\'s Hinges)',
            description: 'Classic method based on median splitting, results are always original data values',
            category: 'academic',
            compatibleWith: ['Statistics Textbooks', 'Alcula Calculator', 'Manual Calculation'],
            verificationSource: 'Alcula Five Number Summary',
            verificationMethod: 'Manual calculation verification',
            precision: 'exact',
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
    static getAlgorithmMetadata(algorithm: QuartileAlgorithm): AlgorithmMetadata {
        return this.ALGORITHM_METADATA[algorithm];
    }

    /**
     * Get metadata for all available algorithms.
     */
    static getAvailableAlgorithms(): AlgorithmMetadata[] {
        return Object.values(this.ALGORITHM_METADATA);
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

        if (sortedData.length === 0) {
            throw new Error('Cannot calculate quartiles for empty dataset');
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
                throw new Error(`Unsupported algorithm: ${algorithm}`);
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
     */
    private static calculateExcelInclusive(
        sortedData: number[],
        median: number
    ): { q1: number; median: number; q3: number } {
        const q1 = this.interpolateR7(sortedData, 0.25);
        const q3 = this.interpolateR7(sortedData, 0.75);

        return { q1, median, q3 };
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
        if (!Array.isArray(numbers) || numbers.length < 4) {
            throw new Error('At least 4 data points required for quartile calculation');
        }

        // Validate all values are finite numbers
        for (let i = 0; i < numbers.length; i++) {
            if (!isFinite(numbers[i])) {
                throw new Error(`Invalid value at index ${i}: ${numbers[i]}. All values must be finite numbers.`);
            }
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

        const results: MultiAlgorithmResults = {} as MultiAlgorithmResults;

        for (const algorithm of Object.keys(this.ALGORITHM_METADATA) as QuartileAlgorithm[]) {
            const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

            try {
                const { q1, median, q3 } = this.calculateQuartiles(sortedData, algorithm);
                const iqr = q3 - q1;

                const lowerFence = q1 - 1.5 * iqr;
                const upperFence = q3 + 1.5 * iqr;
                const outliers: number[] = [];
                const outlierIndices: number[] = [];

                numbers.forEach((value, index) => {
                    if (value < lowerFence || value > upperFence) {
                        outliers.push(value);
                        outlierIndices.push(index);
                    }
                });

                const round = (num: number): number => {
                    return Math.round((num + Number.EPSILON) * 10000) / 10000;
                };

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
                    calculationTime: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime,
                    dataRange: round(dataRange),
                    mean: round(mean)
                };

            } catch (error) {
                throw new Error(`Algorithm ${algorithm} calculation failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return results;
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
        const baseResult = results[baseAlgorithm];
        const comparisons: AlgorithmComparison[] = [];

        for (const [algorithm, result] of Object.entries(results) as [QuartileAlgorithm, StatisticalResults][]) {
            const q1_diff = Math.abs(result.q1 - baseResult.q1);
            const q3_diff = Math.abs(result.q3 - baseResult.q3);
            const iqr_diff = Math.abs(result.iqr - baseResult.iqr);

            const maxDiff = Math.max(q1_diff, q3_diff, iqr_diff);
            let significance: AlgorithmComparison['significance'];

            if (maxDiff < 0.001) {
                significance = 'identical';
            } else if (maxDiff < 0.1) {
                significance = 'minor';
            } else if (maxDiff < 1.0) {
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
            return significance_order.indexOf(a.significance) - significance_order.indexOf(b.significance);
        });
    }

    /**
     * Generate verification links and code for a specific algorithm.
     *
     * @param options - Verification options including algorithm and data.
     * @returns Verification URLs, code snippets, and step-by-step instructions.
     */
    static generateVerification(options: VerificationOptions): VerificationResult {
        const { algorithm, data } = options;

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
            verificationCode,
            expectedResults,
            instructions
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
    static recommendAlgorithm(data: number[], context?: {
        userSoftware?: string;
        useCase?: string;
        experience?: 'beginner' | 'intermediate' | 'expert';
    }): AlgorithmRecommendation {

        const n = data.length;
        const hasRepeats = new Set(data).size < data.length;

        if (context?.userSoftware) {
            const software = context.userSoftware.toLowerCase();

            if (software.includes('excel') || software.includes('sheets')) {
                return {
                    recommended: 'excel_inclusive',
                    reason: 'Fully compatible with Excel/Google Sheets QUARTILE.INC function',
                    confidence: 0.95,
                    alternatives: [
                        { algorithm: 'excel_exclusive', reason: 'If using QUARTILE.EXC / PERCENTILE.EXC' }
                    ]
                };
            }

            if (software.includes('r') || software.includes('python') || software.includes('numpy')) {
                return {
                    recommended: 'r_python_default',
                    reason: 'Consistent with default quartile calculation methods in R and Python',
                    confidence: 0.95,
                    alternatives: [
                        { algorithm: 'wolfram_alpha', reason: 'If Mathematica compatibility is needed' }
                    ]
                };
            }

            if (software.includes('wolfram') || software.includes('mathematica')) {
                return {
                    recommended: 'wolfram_alpha',
                    reason: 'Consistent with WolframAlpha and Mathematica calculation results',
                    confidence: 0.95,
                    alternatives: [
                        { algorithm: 'r_python_default', reason: 'If standard statistical software compatibility is needed' }
                    ]
                };
            }
        }

        if (context?.useCase) {
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
