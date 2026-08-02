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

    // Use Decimal.js to perform precise arithmetic for monetary calculations.
    // This avoids floating-point precision issues that can occur with standard JavaScript number operations.
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