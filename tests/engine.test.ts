import { describe, it, expect } from 'vitest';
import { MultiAlgorithmEngine } from '../src/engine';
import type { QuartileAlgorithm } from '../src/types';

describe('MultiAlgorithmEngine V2.2', () => {
    // Test datasets (from AlgorithmChoice.md documentation)
    const testDataSets = {
        standardOdd: [6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49], // n=11
        standardEven: [6, 7, 15, 36, 39, 40, 41, 42, 43, 47], // n=10
        withDuplicates: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], // duplicate values
        withNegatives: [-5, -3, -1, 0, 1, 3, 5, 7, 9], // negative numbers
        minimal: [1, 2, 3, 4] // minimal dataset
    };

    describe('Algorithm metadata', () => {
        it('should return metadata for all algorithms', () => {
            const algorithms = MultiAlgorithmEngine.getAvailableAlgorithms();
            expect(algorithms).toHaveLength(5);

            const algorithmIds = algorithms.map(a => a.id);
            expect(algorithmIds).toContain('tukey_hinges');
            expect(algorithmIds).toContain('r_python_default');
            expect(algorithmIds).toContain('excel_inclusive');
            expect(algorithmIds).toContain('excel_exclusive');
            expect(algorithmIds).toContain('wolfram_alpha');
        });

        it('should return correct algorithm details', () => {
            const tukeyMeta = MultiAlgorithmEngine.getAlgorithmMetadata('tukey_hinges');
            expect(tukeyMeta.name).toContain('Tukey');
            expect(tukeyMeta.category).toBe('academic');
            expect(tukeyMeta.precision).toBe('exact');
        });
    });

    describe('Single algorithm calculation', () => {
        const data = testDataSets.standardOdd;
        const sortedData = [...data].sort((a, b) => a - b);

        it('Tukey Hinges algorithm should return exact values', () => {
            const result = MultiAlgorithmEngine.calculateQuartiles(sortedData, 'tukey_hinges');
            expect(result.q1).toBeCloseTo(25.5, 2);
            expect(result.median).toBeCloseTo(40, 2);
            expect(result.q3).toBeCloseTo(42.5, 2);
        });

        it('R-7 method should use linear interpolation', () => {
            const result = MultiAlgorithmEngine.calculateQuartiles(sortedData, 'r_python_default');
            expect(result.q1).toBeCloseTo(25.5, 2);
            expect(result.median).toBeCloseTo(40, 2);
            expect(result.q3).toBeCloseTo(42.5, 2);
        });

        it('Excel compatible mode should match QUARTILE.INC', () => {
            const result = MultiAlgorithmEngine.calculateQuartiles(sortedData, 'excel_inclusive');
            expect(result.q1).toBeCloseTo(25.5, 2);
            expect(result.median).toBeCloseTo(40, 2);
            expect(result.q3).toBeCloseTo(42.5, 2);
        });

        it('Excel exclusive mode should match QUARTILE.EXC', () => {
            const result = MultiAlgorithmEngine.calculateQuartiles(sortedData, 'excel_exclusive');
            expect(result.q1).toBeCloseTo(15, 2);
            expect(result.median).toBeCloseTo(40, 2);
            expect(result.q3).toBeCloseTo(43, 2);
        });

        it('WolframAlpha compatible mode should match R-5 method', () => {
            const result = MultiAlgorithmEngine.calculateQuartiles(sortedData, 'wolfram_alpha');
            expect(result.q1).toBeCloseTo(20.25, 2);
            expect(result.median).toBeCloseTo(40, 2);
            expect(result.q3).toBeCloseTo(42.75, 2);
        });
    });

    describe('Multi-algorithm parallel calculation', () => {
        it('should return complete results for all algorithms', () => {
            const data = testDataSets.standardOdd;
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);

            expect(Object.keys(results)).toHaveLength(5);
            expect(results.tukey_hinges).toBeDefined();
            expect(results.r_python_default).toBeDefined();
            expect(results.excel_inclusive).toBeDefined();
            expect(results.excel_exclusive).toBeDefined();
            expect(results.wolfram_alpha).toBeDefined();

            for (const algorithm of Object.keys(results) as QuartileAlgorithm[]) {
                const result = results[algorithm];
                expect(result.minimum).toBeTypeOf('number');
                expect(result.maximum).toBeTypeOf('number');
                expect(result.q1).toBeTypeOf('number');
                expect(result.median).toBeTypeOf('number');
                expect(result.q3).toBeTypeOf('number');
                expect(result.iqr).toBeTypeOf('number');
                expect(result.fiveNumberSummary).toHaveLength(5);
                expect(result.calculationTime).toBeGreaterThanOrEqual(0);
            }
        });

        it('should handle edge cases', () => {
            const data = testDataSets.minimal;
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);

            expect(Object.keys(results)).toHaveLength(5);

            for (const result of Object.values(results)) {
                expect(result.minimum).toBe(1);
                expect(result.maximum).toBe(4);
                expect(result.count).toBe(4);
                expect(result.q1).toBeGreaterThanOrEqual(1);
                expect(result.q3).toBeLessThanOrEqual(4);
                expect(result.q1).toBeLessThanOrEqual(result.median);
                expect(result.median).toBeLessThanOrEqual(result.q3);
            }
        });

        it('should handle data with duplicate values', () => {
            const data = testDataSets.withDuplicates;
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);

            expect(Object.keys(results)).toHaveLength(5);

            for (const result of Object.values(results)) {
                expect(result.minimum).toBe(1);
                expect(result.maximum).toBe(5);
                expect(result.q1).toBeGreaterThanOrEqual(1);
                expect(result.q3).toBeLessThanOrEqual(5);
            }
        });

        it('should handle data with negative numbers', () => {
            const data = testDataSets.withNegatives;
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);

            expect(Object.keys(results)).toHaveLength(5);

            for (const result of Object.values(results)) {
                expect(result.minimum).toBe(-5);
                expect(result.maximum).toBe(9);
                expect(result.q1).toBeGreaterThanOrEqual(-5);
                expect(result.q3).toBeLessThanOrEqual(9);
            }
        });
    });

    describe('Algorithm comparison functionality', () => {
        it('should correctly compare algorithm differences', () => {
            const data = testDataSets.standardOdd;
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);
            const comparisons = MultiAlgorithmEngine.compareAlgorithms(results, 'r_python_default');

            expect(comparisons).toHaveLength(5);

            for (const comparison of comparisons) {
                expect(comparison.algorithm).toBeTypeOf('string');
                expect(comparison.results).toBeDefined();
                expect(comparison.differences.q1_diff).toBeGreaterThanOrEqual(0);
                expect(comparison.differences.q3_diff).toBeGreaterThanOrEqual(0);
                expect(comparison.differences.iqr_diff).toBeGreaterThanOrEqual(0);
                expect(['identical', 'minor', 'significant', 'major']).toContain(comparison.significance);
            }

            const baseSelf = comparisons.find(c => c.algorithm === 'r_python_default');
            expect(baseSelf?.significance).toBe('identical');
        });

        it('should correctly identify identical results', () => {
            const data = [1, 2, 3, 4, 5];
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);
            const comparisons = MultiAlgorithmEngine.compareAlgorithms(results, 'tukey_hinges');

            const significances = comparisons.map(c => c.significance);
            expect(significances).toContain('identical');
        });
    });

    describe('Verification functionality', () => {
        it('should generate WolframAlpha verification link', () => {
            const data = [1, 2, 3, 4, 5];
            const verification = MultiAlgorithmEngine.generateVerification({
                algorithm: 'wolfram_alpha',
                data,
                includeSteps: true
            });

            expect(verification.algorithm).toBe('wolfram_alpha');
            expect(verification.verificationUrl).toContain('wolframalpha.com');
            expect(verification.verificationUrl).toContain('quartiles');
            expect(verification.verificationCode).toContain('quartiles of');
            expect(verification.instructions).toHaveLength(4);
            expect(verification.expectedResults.q1).toBeTypeOf('number');
            expect(verification.expectedResults.median).toBeTypeOf('number');
            expect(verification.expectedResults.q3).toBeTypeOf('number');
        });

        it('should generate R/Python verification code', () => {
            const data = [1, 2, 3, 4, 5];
            const verification = MultiAlgorithmEngine.generateVerification({
                algorithm: 'r_python_default',
                data
            });

            expect(verification.verificationCode).toContain('quantile');
            expect(verification.verificationCode).toContain('type=7');
            expect(verification.verificationCode).toContain('numpy');
            expect(verification.verificationCode).toContain('percentile');
            expect(verification.instructions).toHaveLength(4);
        });

        it('should generate Excel verification formula', () => {
            const data = [1, 2, 3, 4, 5];
            const verification = MultiAlgorithmEngine.generateVerification({
                algorithm: 'excel_inclusive',
                data
            });

            expect(verification.verificationCode).toContain('QUARTILE.INC');
            expect(verification.verificationCode).toContain('A1:A5');
            expect(verification.instructions).toHaveLength(4);
        });

        it('should generate manual calculation steps', () => {
            const data = [1, 2, 3, 4, 5];
            const verification = MultiAlgorithmEngine.generateVerification({
                algorithm: 'tukey_hinges',
                data
            });

            expect(verification.verificationCode).toContain('Manual calculation steps');
            expect(verification.verificationCode).toContain('After sorting');
            expect(verification.instructions).toHaveLength(4);
        });
    });

    describe('Smart recommendation functionality', () => {
        it('should recommend algorithm based on software', () => {
            const data = [1, 2, 3, 4, 5];

            const excelRec = MultiAlgorithmEngine.recommendAlgorithm(data, {
                userSoftware: 'Microsoft Excel'
            });
            expect(excelRec.recommended).toBe('excel_inclusive');
            expect(excelRec.confidence).toBeGreaterThan(0.9);

            const rRec = MultiAlgorithmEngine.recommendAlgorithm(data, {
                userSoftware: 'R language'
            });
            expect(rRec.recommended).toBe('r_python_default');
            expect(rRec.confidence).toBeGreaterThan(0.9);
        });

        it('should recommend algorithm based on use case', () => {
            const data = [1, 2, 3, 4, 5];

            const learningRec = MultiAlgorithmEngine.recommendAlgorithm(data, {
                useCase: 'Statistics course learning'
            });
            expect(learningRec.recommended).toBe('tukey_hinges');
            expect(learningRec.confidence).toBeGreaterThan(0.8);
        });

        it('should recommend algorithm based on experience level', () => {
            const data = [1, 2, 3, 4, 5];

            const beginnerRec = MultiAlgorithmEngine.recommendAlgorithm(data, {
                experience: 'beginner'
            });
            expect(beginnerRec.recommended).toBe('tukey_hinges');
            expect(beginnerRec.confidence).toBeGreaterThan(0.7);
        });

        it('should provide default recommendation', () => {
            const data = [1, 2, 3, 4, 5];
            const defaultRec = MultiAlgorithmEngine.recommendAlgorithm(data);

            expect(defaultRec.recommended).toBe('r_python_default');
            expect(defaultRec.reason).toContain('Standard method');
            expect(defaultRec.alternatives).toHaveLength(2);
        });
    });

    describe('Error handling', () => {
        it('should reject empty dataset', () => {
            expect(() => {
                MultiAlgorithmEngine.calculateAllAlgorithms([]);
            }).toThrow('At least 4 data points required');
        });

        it('should reject insufficient data', () => {
            expect(() => {
                MultiAlgorithmEngine.calculateAllAlgorithms([1, 2, 3]);
            }).toThrow('At least 4 data points required');
        });

        it('should handle invalid algorithm type', () => {
            const data = [1, 2, 3, 4, 5];
            const sortedData = [...data].sort((a, b) => a - b);

            expect(() => {
                MultiAlgorithmEngine.calculateQuartiles(sortedData, 'invalid_algorithm' as QuartileAlgorithm);
            }).toThrow('Unsupported algorithm');
        });

        it('should reject NaN values in dataset', () => {
            expect(() => {
                MultiAlgorithmEngine.calculateAllAlgorithms([1, 2, NaN, 4, 5]);
            }).toThrow('Invalid value at index 2');
        });

        it('should reject Infinity values in dataset', () => {
            expect(() => {
                MultiAlgorithmEngine.calculateAllAlgorithms([1, 2, Infinity, 4, 5]);
            }).toThrow('Invalid value at index 2');
        });

        it('should reject -Infinity values in dataset', () => {
            expect(() => {
                MultiAlgorithmEngine.calculateAllAlgorithms([1, -Infinity, 3, 4, 5]);
            }).toThrow('Invalid value at index 1');
        });

        it('should reject unsorted data in calculateQuartiles', () => {
            expect(() => {
                MultiAlgorithmEngine.calculateQuartiles([5, 3, 1, 4, 2], 'r_python_default');
            }).toThrow('Data must be sorted in ascending order');
        });
    });

    describe('Precision and numerical stability', () => {
        it('should maintain 4 decimal places precision', () => {
            const data = [1.23456789, 2.34567890, 3.45678901, 4.56789012];
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);

            for (const result of Object.values(results)) {
                const checkPrecision = (num: number) => {
                    const str = num.toString();
                    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
                    return decimals <= 4;
                };

                expect(checkPrecision(result.q1)).toBe(true);
                expect(checkPrecision(result.median)).toBe(true);
                expect(checkPrecision(result.q3)).toBe(true);
                expect(checkPrecision(result.iqr)).toBe(true);
                expect(checkPrecision(result.variance)).toBe(true);
                expect(checkPrecision(result.standardDeviation)).toBe(true);
            }
        });

        it('should handle dataset with identical values', () => {
            const data = [5, 5, 5, 5, 5];
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);

            for (const result of Object.values(results)) {
                expect(result.q1).toBe(5);
                expect(result.median).toBe(5);
                expect(result.q3).toBe(5);
                expect(result.iqr).toBe(0);
                expect(result.outliers).toHaveLength(0);
                expect(result.variance).toBe(0);
                expect(result.standardDeviation).toBe(0);
            }
        });
    });

    describe('Variance and standard deviation', () => {
        it('should compute correct variance and stddev for known dataset', () => {
            // Data: [2, 4, 4, 4, 5, 5, 7, 9], mean = 5, variance = 4, stddev = 2
            const data = [2, 4, 4, 4, 5, 5, 7, 9];
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);

            // variance and stddev are algorithm-independent (same for all)
            for (const result of Object.values(results)) {
                expect(result.variance).toBe(4);
                expect(result.standardDeviation).toBe(2);
                expect(result.mean).toBe(5);
            }
        });

        it('should return same variance across all algorithms', () => {
            const data = [6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49];
            const results = MultiAlgorithmEngine.calculateAllAlgorithms(data);
            const algorithms = Object.keys(results) as QuartileAlgorithm[];

            const firstVariance = results[algorithms[0]].variance;
            const firstStdDev = results[algorithms[0]].standardDeviation;

            for (const alg of algorithms) {
                expect(results[alg].variance).toBe(firstVariance);
                expect(results[alg].standardDeviation).toBe(firstStdDev);
            }
        });
    });
});
