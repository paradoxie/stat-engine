/**
 * @plotnerd/stat-engine — Shared Math Utilities
 *
 * Core mathematical functions used by the multi-algorithm engine.
 * Extracted for DRY compliance and independent testability.
 *
 * @packageDocumentation
 */

/**
 * Calculate the median of a sorted numeric array.
 * Uses numerically stable midpoint calculation to prevent overflow
 * when summing large values: `mid1 + (mid2 - mid1) / 2` instead of `(mid1 + mid2) / 2`.
 *
 * @param sortedData - A pre-sorted array of numbers (ascending). Must not be empty.
 * @returns The median value.
 * @throws {Error} If the array is empty.
 *
 * @example
 * ```ts
 * calculateMedian([1, 2, 3]);       // 2
 * calculateMedian([1, 2, 3, 4]);    // 2.5
 * ```
 */
export function calculateMedian(sortedData: number[]): number {
    if (sortedData.length === 0) {
        throw new Error('Cannot calculate median of an empty array');
    }

    const n = sortedData.length;
    if (n === 1) {
        return sortedData[0];
    }

    if (n % 2 === 0) {
        const mid1 = sortedData[n / 2 - 1];
        const mid2 = sortedData[n / 2];
        // Overflow-safe midpoint: avoids (mid1 + mid2) which can exceed Number.MAX_SAFE_INTEGER
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
 * @param decimals - Number of decimal places (default: 4). Must be a non-negative integer.
 * @returns The rounded number.
 * @throws {Error} If `num` is not finite or `decimals` is negative.
 *
 * @example
 * ```ts
 * roundToPrecision(3.14159, 2);   // 3.14
 * roundToPrecision(2.005, 2);     // 2.01 (epsilon-aware)
 * ```
 */
export function roundToPrecision(num: number, decimals: number = 4): number {
    if (!isFinite(num)) {
        throw new Error(`Cannot round non-finite value: ${num}`);
    }
    if (decimals < 0 || !Number.isInteger(decimals)) {
        throw new Error(`Decimal places must be a non-negative integer, got: ${decimals}`);
    }

    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Kahan summation (compensated summation) for improved floating-point accuracy.
 * Reduces accumulated rounding error when summing many values with mixed magnitudes.
 *
 * Standard `Array.reduce((a,b) => a+b)` can lose precision due to catastrophic
 * cancellation. Kahan summation maintains a separate compensation variable to
 * track the "lost" low-order bits from each addition, achieving O(1) worst-case
 * error instead of O(n).
 *
 * @param values - Array of numbers to sum. Empty arrays return 0.
 * @returns The compensated sum.
 *
 * @example
 * ```ts
 * kahanSum([0.1, 0.2, 0.3]);      // 0.6 (exact)
 * // vs naive:  0.1 + 0.2 + 0.3   // 0.6000000000000001
 * ```
 */
export function kahanSum(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }

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

/**
 * Check if an array is sorted in ascending (non-decreasing) order.
 * Uses an early-return strategy for performance — bails at the first
 * violation rather than scanning the entire array.
 *
 * @param data - Array of numbers to check.
 * @returns `true` if sorted ascending, `false` otherwise.
 *
 * @internal
 */
export function isSortedAscending(data: number[]): boolean {
    for (let i = 1; i < data.length; i++) {
        if (data[i] < data[i - 1]) {
            return false;
        }
    }
    return true;
}

/**
 * Calculate the population variance of a dataset.
 * Uses the two-pass algorithm for numerical stability.
 *
 * @param data - Array of numbers. Must not be empty.
 * @param mean - Pre-computed mean (avoids redundant calculation).
 * @returns The population variance.
 *
 * @internal
 */
export function calculateVariance(data: number[], mean: number): number {
    if (data.length === 0) {
        return 0;
    }

    // Two-pass algorithm: first compute mean (provided), then sum squared deviations
    // This is more numerically stable than the single-pass (sum of squares) method
    let sumSquaredDev = 0;
    for (const value of data) {
        const diff = value - mean;
        sumSquaredDev += diff * diff;
    }

    return sumSquaredDev / data.length;
}

/**
 * Calculate the population standard deviation of a dataset.
 *
 * @param data - Array of numbers. Must not be empty.
 * @param mean - Pre-computed mean (avoids redundant calculation).
 * @returns The population standard deviation.
 *
 * @internal
 */
export function calculateStdDev(data: number[], mean: number): number {
    return Math.sqrt(calculateVariance(data, mean));
}
