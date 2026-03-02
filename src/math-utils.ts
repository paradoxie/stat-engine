/**
 * @plotnerd/stat-engine — Shared Math Utilities
 *
 * Core mathematical functions used by the multi-algorithm engine.
 * Extracted for DRY compliance and independent testability.
 */

/**
 * Calculate the median of a sorted numeric array.
 * Uses numerically stable midpoint calculation to prevent overflow
 * when summing large values: `mid1 + (mid2 - mid1) / 2` instead of `(mid1 + mid2) / 2`.
 *
 * @param sortedData - A pre-sorted array of numbers (ascending). Must not be empty.
 * @returns The median value.
 */
export function calculateMedian(sortedData: number[]): number {
    const n = sortedData.length;
    if (n % 2 === 0) {
        const mid1 = sortedData[n / 2 - 1];
        const mid2 = sortedData[n / 2];
        return mid1 + (mid2 - mid1) / 2;
    } else {
        return sortedData[Math.floor(n / 2)];
    }
}

/**
 * Round a number to the specified decimal precision using epsilon-aware rounding.
 * Handles floating-point edge cases like `0.00005` being rounded correctly.
 *
 * @param num - The number to round. Must be finite.
 * @param decimals - Number of decimal places (default: 4).
 * @returns The rounded number.
 * @throws If `num` is not finite.
 */
export function roundToPrecision(num: number, decimals: number = 4): number {
    if (!isFinite(num)) {
        throw new Error(`Cannot round invalid value: ${num}`);
    }
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Kahan summation (compensated summation) for improved floating-point accuracy.
 * Useful when summing many values with mixed magnitudes.
 *
 * @param values - Array of numbers to sum.
 * @returns The compensated sum.
 */
export function kahanSum(values: number[]): number {
    let sum = 0;
    let compensation = 0;

    for (const value of values) {
        const corrected = value - compensation;
        const newSum = sum + corrected;
        compensation = (newSum - sum) - corrected;
        sum = newSum;
    }

    return sum;
}
