import Decimal from "decimal.js";

export type CalculateLineItemTotalInput = {
    unitPrice: number;
    quantity: number;
    setupFee: number;
};

export function calculateLineItemTotal(
    input: CalculateLineItemTotalInput,
): Decimal {
    const { unitPrice, quantity, setupFee } = input;

    // Keep intermediate monetary values unrounded.
    // Apply ROUND_HALF_UP only at display/output boundaries so grouped
    // totals do not compound rounding at each calculation step.
    const total = new Decimal(unitPrice)
        .times(quantity)
        .plus(setupFee);

    return total;
}

export function toMoneyNumber(
    value: Decimal,
): number {
    return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}