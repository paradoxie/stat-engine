/**
 * Custom error classes for @plotnerd/stat-engine.
 *
 * Provides typed error hierarchies so consumers can catch specific
 * error categories (validation vs algorithm failure) without string matching.
 *
 * @example
 * ```ts
 * import { MultiAlgorithmEngine, ValidationError, StatEngineError } from '@plotnerd/stat-engine';
 *
 * try {
 *     const results = MultiAlgorithmEngine.calculateAllAlgorithms([1]);
 * } catch (err) {
 *     if (err instanceof ValidationError) {
 *         console.error('Bad input:', err.message);
 *     } else if (err instanceof StatEngineError) {
 *         console.error('Engine failure:', err.message);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Base error class for all stat-engine errors.
 *
 * Extends the native `Error` with a stable `name` property for reliable
 * `instanceof` checks across module boundaries.
 */
export class StatEngineError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StatEngineError';
        // Maintain proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when input data fails validation (wrong type, empty, NaN, etc.).
 *
 * @example
 * ```ts
 * try {
 *     engine.calculateAllAlgorithms([1, '2', 3, 4]);
 * } catch (err) {
 *     if (err instanceof ValidationError) {
 *         // err.field — which parameter failed
 *         // err.message — human-readable description
 *     }
 * }
 * ```
 */
export class ValidationError extends StatEngineError {
    /** The field or parameter that failed validation. */
    readonly field: string;

    constructor(message: string, field: string = 'data') {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * Thrown when an algorithm calculation fails internally.
 */
export class AlgorithmError extends StatEngineError {
    /** The algorithm that failed. */
    readonly algorithm: string;

    constructor(message: string, algorithm: string) {
        super(message);
        this.name = 'AlgorithmError';
        this.algorithm = algorithm;
    }
}
