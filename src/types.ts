// ==================== @plotnerd/stat-engine Type Definitions ====================

/**
 * Supported quartile calculation algorithms.
 *
 * - `tukey_hinges`     – Textbook method (Tukey's Hinges)
 * - `r_python_default` – Universal standard (R type=7, Python NumPy, Google Sheets)
 * - `excel_inclusive`   – Excel QUARTILE.INC / PERCENTILE.INC
 * - `excel_exclusive`   – Excel QUARTILE.EXC / PERCENTILE.EXC
 * - `wolfram_alpha`     – WolframAlpha / Mathematica (R-5 method)
 */
export type QuartileAlgorithm =
    | 'tukey_hinges'
    | 'r_python_default'
    | 'excel_inclusive'
    | 'excel_exclusive'
    | 'wolfram_alpha';

/** Metadata describing a quartile algorithm. */
export interface AlgorithmMetadata {
    id: QuartileAlgorithm;
    name: string;
    description: string;
    category: 'academic' | 'software' | 'statistical';
    compatibleWith: string[];
    verificationSource: string;
    verificationMethod: string;
    precision: 'exact' | 'interpolated';
    complexity: 'low' | 'medium' | 'high';
}

/** Statistical results for a single algorithm. */
export interface StatisticalResults {
    minimum: number;
    maximum: number;
    count: number;
    sum: number;
    q1: number;
    median: number;
    q3: number;
    iqr: number;
    fiveNumberSummary: [number, number, number, number, number];
    outliers: number[];
    outlierIndices: number[];
    lowerFence: number;
    upperFence: number;
    /** Population variance (σ²). */
    variance: number;
    /** Population standard deviation (σ). */
    standardDeviation: number;
    calculationTime: number;
    dataRange: number;
    mean: number;
}

/** Results from all algorithms keyed by algorithm name. */
export type MultiAlgorithmResults = {
    [key in QuartileAlgorithm]: StatisticalResults;
};

/** Comparison between an algorithm's results and a base algorithm. */
export interface AlgorithmComparison {
    algorithm: QuartileAlgorithm;
    results: StatisticalResults;
    differences: {
        q1_diff: number;
        q3_diff: number;
        iqr_diff: number;
    };
    significance: 'identical' | 'minor' | 'significant' | 'major';
    verificationUrl?: string;
    verificationCode?: string;
}

/** Options for generating verification links and code. */
export interface VerificationOptions {
    algorithm: QuartileAlgorithm;
    data: number[];
    includeSteps?: boolean;
    includeCode?: boolean;
}

/** Verification result with expected values and instructions. */
export interface VerificationResult {
    algorithm: QuartileAlgorithm;
    verificationUrl: string;
    verificationCode: string;
    expectedResults: {
        q1: number;
        median: number;
        q3: number;
    };
    instructions: string[];
}

/** Algorithm recommendation with confidence and alternatives. */
export interface AlgorithmRecommendation {
    recommended: QuartileAlgorithm;
    reason: string;
    confidence: number;
    alternatives: {
        algorithm: QuartileAlgorithm;
        reason: string;
    }[];
}
