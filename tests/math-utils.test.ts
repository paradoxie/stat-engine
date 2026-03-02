import { describe, it, expect } from 'vitest';
import {
    calculateMedian,
    roundToPrecision,
    kahanSum,
    isSortedAscending,
    calculateVariance,
    calculateStdDev,
} from '../src/math-utils';

// ─────────────────────────────────────────────────────────
// calculateMedian
// ─────────────────────────────────────────────────────────
describe('calculateMedian', () => {
    it('should return the middle value for odd-length arrays', () => {
        expect(calculateMedian([1, 2, 3])).toBe(2);
        expect(calculateMedian([1, 3, 5, 7, 9])).toBe(5);
    });

    it('should return the average of two middle values for even-length arrays', () => {
        expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
        expect(calculateMedian([1, 3, 5, 7])).toBe(4);
    });

    it('should handle single-element arrays', () => {
        expect(calculateMedian([42])).toBe(42);
        expect(calculateMedian([0])).toBe(0);
        expect(calculateMedian([-7])).toBe(-7);
    });

    it('should throw for empty arrays', () => {
        expect(() => calculateMedian([])).toThrow('Cannot calculate median of an empty array');
    });

    it('should handle arrays with identical values', () => {
        expect(calculateMedian([5, 5, 5, 5])).toBe(5);
        expect(calculateMedian([5, 5, 5])).toBe(5);
    });

    it('should handle negative numbers', () => {
        expect(calculateMedian([-5, -3, -1])).toBe(-3);
        expect(calculateMedian([-10, -5, 0, 5])).toBe(-2.5);
    });

    it('should use overflow-safe midpoint for large values', () => {
        // Standard (a + b) / 2 would overflow for very large values
        const large = Number.MAX_SAFE_INTEGER;
        const result = calculateMedian([large - 1, large]);
        expect(result).toBeCloseTo(large - 0.5, 0);
    });

    it('should handle two-element arrays', () => {
        expect(calculateMedian([1, 3])).toBe(2);
        expect(calculateMedian([0, 100])).toBe(50);
    });
});

// ─────────────────────────────────────────────────────────
// roundToPrecision
// ─────────────────────────────────────────────────────────
describe('roundToPrecision', () => {
    it('should round to default 4 decimal places', () => {
        expect(roundToPrecision(3.14159)).toBe(3.1416);
        expect(roundToPrecision(1.23456)).toBe(1.2346);
    });

    it('should round to specified decimal places', () => {
        expect(roundToPrecision(3.14159, 2)).toBe(3.14);
        expect(roundToPrecision(3.14159, 0)).toBe(3);
        expect(roundToPrecision(3.14159, 6)).toBe(3.14159);
    });

    it('should handle zero correctly', () => {
        expect(roundToPrecision(0)).toBe(0);
        expect(roundToPrecision(0, 2)).toBe(0);
    });

    it('should handle negative numbers', () => {
        expect(roundToPrecision(-3.14159, 2)).toBe(-3.14);
        expect(roundToPrecision(-0.005, 2)).toBe(-0);
    });

    it('should handle edge case 2.005 with epsilon-aware rounding', () => {
        // Classic floating-point trap: Math.round(2.005 * 100) / 100 = 2.00
        // Epsilon-aware rounding should give 2.01
        expect(roundToPrecision(2.005, 2)).toBe(2.01);
    });

    it('should throw for non-finite values', () => {
        expect(() => roundToPrecision(Infinity)).toThrow('Cannot round non-finite value');
        expect(() => roundToPrecision(-Infinity)).toThrow('Cannot round non-finite value');
        expect(() => roundToPrecision(NaN)).toThrow('Cannot round non-finite value');
    });

    it('should throw for negative decimal places', () => {
        expect(() => roundToPrecision(3.14, -1)).toThrow('non-negative integer');
    });

    it('should throw for non-integer decimal places', () => {
        expect(() => roundToPrecision(3.14, 2.5)).toThrow('non-negative integer');
    });

    it('should handle large numbers of decimal places', () => {
        expect(roundToPrecision(1 / 3, 10)).toBeCloseTo(0.3333333333, 10);
    });
});

// ─────────────────────────────────────────────────────────
// kahanSum
// ─────────────────────────────────────────────────────────
describe('kahanSum', () => {
    it('should return 0 for empty arrays', () => {
        expect(kahanSum([])).toBe(0);
    });

    it('should sum simple arrays correctly', () => {
        expect(kahanSum([1, 2, 3])).toBe(6);
        expect(kahanSum([10, 20, 30])).toBe(60);
    });

    it('should handle single-element arrays', () => {
        expect(kahanSum([42])).toBe(42);
    });

    it('should maintain precision where naive summation fails', () => {
        // Classic floating-point problem: 0.1 + 0.2 + 0.3 ≠ 0.6 naively
        const result = kahanSum([0.1, 0.2, 0.3]);
        expect(result).toBeCloseTo(0.6, 15);
    });

    it('should handle mixed positive and negative values', () => {
        expect(kahanSum([1, -1, 2, -2, 3, -3])).toBe(0);
    });

    it('should handle many small values with high precision', () => {
        // Sum of 1000 copies of 0.001 should be 1.0
        const values = Array(1000).fill(0.001);
        expect(kahanSum(values)).toBeCloseTo(1.0, 10);
    });

    it('should handle negative values', () => {
        expect(kahanSum([-1, -2, -3])).toBe(-6);
    });

    it('should handle large magnitude differences', () => {
        // Large value followed by many small values
        const values = [1e15, ...Array(100).fill(1)];
        const result = kahanSum(values);
        expect(result).toBe(1e15 + 100);
    });
});

// ─────────────────────────────────────────────────────────
// isSortedAscending
// ─────────────────────────────────────────────────────────
describe('isSortedAscending', () => {
    it('should return true for sorted arrays', () => {
        expect(isSortedAscending([1, 2, 3, 4, 5])).toBe(true);
        expect(isSortedAscending([-3, -1, 0, 2, 5])).toBe(true);
    });

    it('should return true for arrays with equal consecutive elements', () => {
        expect(isSortedAscending([1, 1, 2, 2, 3])).toBe(true);
        expect(isSortedAscending([5, 5, 5, 5])).toBe(true);
    });

    it('should return false for unsorted arrays', () => {
        expect(isSortedAscending([3, 1, 2])).toBe(false);
        expect(isSortedAscending([1, 3, 2])).toBe(false);
    });

    it('should return true for empty and single-element arrays', () => {
        expect(isSortedAscending([])).toBe(true);
        expect(isSortedAscending([42])).toBe(true);
    });

    it('should return true for two-element sorted arrays', () => {
        expect(isSortedAscending([1, 2])).toBe(true);
    });

    it('should return false for two-element unsorted arrays', () => {
        expect(isSortedAscending([2, 1])).toBe(false);
    });

    it('should detect unsorted at the end of array', () => {
        expect(isSortedAscending([1, 2, 3, 4, 3])).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────
// calculateVariance & calculateStdDev
// ─────────────────────────────────────────────────────────
describe('calculateVariance', () => {
    it('should return 0 for single-value datasets', () => {
        expect(calculateVariance([5], 5)).toBe(0);
    });

    it('should return 0 for identical values', () => {
        expect(calculateVariance([3, 3, 3, 3], 3)).toBe(0);
    });

    it('should calculate population variance correctly', () => {
        // Data: [2, 4, 4, 4, 5, 5, 7, 9], mean = 5
        // Variance = ((2-5)² + (4-5)² + (4-5)² + (4-5)² + (5-5)² + (5-5)² + (7-5)² + (9-5)²) / 8
        //          = (9 + 1 + 1 + 1 + 0 + 0 + 4 + 16) / 8 = 32 / 8 = 4
        expect(calculateVariance([2, 4, 4, 4, 5, 5, 7, 9], 5)).toBe(4);
    });

    it('should return 0 for empty arrays', () => {
        expect(calculateVariance([], 0)).toBe(0);
    });

    it('should handle negative values', () => {
        // Data: [-2, -1, 0, 1, 2], mean = 0
        // Variance = (4 + 1 + 0 + 1 + 4) / 5 = 2
        expect(calculateVariance([-2, -1, 0, 1, 2], 0)).toBe(2);
    });
});

describe('calculateStdDev', () => {
    it('should return 0 for identical values', () => {
        expect(calculateStdDev([3, 3, 3, 3], 3)).toBe(0);
    });

    it('should return the square root of variance', () => {
        // Variance = 4, so stddev = 2
        expect(calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9], 5)).toBe(2);
    });

    it('should handle negative values', () => {
        // Variance = 2, so stddev = sqrt(2) ≈ 1.4142
        expect(calculateStdDev([-2, -1, 0, 1, 2], 0)).toBeCloseTo(Math.sqrt(2), 10);
    });
});
