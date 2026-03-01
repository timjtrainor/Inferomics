/**
 * Calculates the required sample size using the Cochran Formula.
 * 
 * Formula for infinite population:
 * n0 = (Z^2 * p * q) / e^2
 * 
 * Adjusted for finite population:
 * n = n0 / (1 + (n0 - 1) / N)
 * 
 * @param populationSize (N) Total number of records in the dataset
 * @param marginOfError (e) The desired margin of error (e.g., 0.05 for 5%)
 * @param confidenceLevel (Z) Z-score for confidence level (default 1.96 for 95%)
 */
export function calculateCochran(
    populationSize: number,
    marginOfError: number,
    confidenceLevel: number = 1.96
): number {
    if (populationSize <= 0) return 0;

    const p = 0.5; // Maximum variability (usually used for conservative estimates)
    const q = 1 - p;

    // Calculate n0 for infinite population
    const n0 = (Math.pow(confidenceLevel, 2) * p * q) / Math.pow(marginOfError, 2);

    // Adjust for finite population
    const n = n0 / (1 + (n0 - 1) / populationSize);

    return Math.ceil(n);
}
