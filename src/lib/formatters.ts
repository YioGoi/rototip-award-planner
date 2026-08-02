export function formatMoney(
    value: number,
    currency: string,
    maximumFractionDigits = 2,
): string {
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits,
    }).format(value);
}

export function formatPercentage(
    value: number,
): string {
    return new Intl.NumberFormat("en-IE", {
        style: "percent",
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatDateTime(
    value: string,
): string {
    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
    }).format(new Date(value));
}