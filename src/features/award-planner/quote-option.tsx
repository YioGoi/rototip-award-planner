import type {
    EligibilityResult,
} from "@/domain/eligibility";
import type {
    Bid,
    LineItemQuote,
    Partner,
    RfqLineItem,
} from "@/domain/schemas";
import {
    EligibilityMessage,
} from "./eligibility-message";
import {
    formatDateTime,
    formatMoney,
    formatPercentage,
} from "@/lib/formatters";
import {
    calculateLineItemTotal,
    toMoneyNumber,
} from "@/domain/money";

type QuoteOptionProps = {
    partner: Partner;
    bid: Bid;
    lineItem: RfqLineItem;
    quote: LineItemQuote | undefined;
    eligibilityResult: EligibilityResult;
    selected: boolean;
    disabled: boolean;
    onSelect: () => void;
};

export function QuoteOption({
    partner,
    bid,
    lineItem,
    quote,
    eligibilityResult,
    selected,
    disabled,
    onSelect,
}: QuoteOptionProps) {
    // The shipping fee is excluded from the line-item total because it is a bid-level charge.
    // Even when multiple line items are selected from the same bid, shipping is charged only once.
    const lineTotal = quote
        ? toMoneyNumber(
            calculateLineItemTotal({
                unitPrice: quote.unitPrice,
                quantity: lineItem.quantity,
                setupFee: quote.setupFee,
            }),
        )
        : undefined;

    const inputId =
        `selection-${lineItem.id}-${bid.id}`;

    return (
        <article
            className={`rounded-xl border bg-white p-5 ${selected
                ? eligibilityResult.eligible
                    ? "border-emerald-500 ring-2 ring-emerald-100"
                    : "border-red-500 ring-2 ring-red-100"
                : "border-slate-200"
                }`}
        >
            <header className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <input
                        id={inputId}
                        type="radio"
                        name={`award-${lineItem.id}`}
                        value={bid.id}
                        checked={selected}
                        disabled={disabled}
                        onChange={onSelect}
                        aria-label={`Select ${partner.name} for ${lineItem.partNumber}`}
                        className="mt-1 size-4 accent-emerald-700"
                    />

                    <div>
                        <h3 className="font-semibold text-slate-950">
                            <label
                                htmlFor={inputId}
                                className={
                                    disabled
                                        ? "cursor-not-allowed"
                                        : "cursor-pointer"
                                }
                            >
                                {partner.name}
                            </label>
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {partner.country} · {bid.id}
                        </p>
                    </div>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {bid.status}
                </span>
            </header>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <dt className="text-slate-500">
                        Quality rating
                    </dt>
                    <dd className="mt-1 font-medium text-slate-900">
                        {partner.qualityRating.toFixed(1)} / 5
                    </dd>
                </div>

                <div>
                    <dt className="text-slate-500">
                        On-time delivery
                    </dt>
                    <dd className="mt-1 font-medium text-slate-900">
                        {formatPercentage(
                            partner.onTimeDeliveryRate,
                        )}
                    </dd>
                </div>

                <div>
                    <dt className="text-slate-500">
                        Valid until
                    </dt>
                    <dd className="mt-1 font-medium text-slate-900">
                        {formatDateTime(bid.validUntil)}
                    </dd>
                </div>

                <div>
                    <dt className="text-slate-500">
                        Bid shipping
                    </dt>
                    <dd className="mt-1 font-medium text-slate-900">
                        {formatMoney(
                            bid.shippingFee,
                            bid.currency,
                        )}
                    </dd>
                </div>
            </dl>

            <div className="mt-4">
                <EligibilityMessage
                    result={eligibilityResult}
                />
            </div>

            {quote && lineTotal !== undefined ? (
                <div className="mt-5 border-t border-slate-200 pt-5">
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-slate-500">
                                Unit price
                            </dt>
                            <dd className="mt-1 font-medium text-slate-900">
                                {formatMoney(
                                    quote.unitPrice,
                                    bid.currency,
                                    3,
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                Setup fee
                            </dt>
                            <dd className="mt-1 font-medium text-slate-900">
                                {formatMoney(
                                    quote.setupFee,
                                    bid.currency,
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                Line total
                            </dt>
                            <dd className="mt-1 font-semibold text-slate-950">
                                {formatMoney(
                                    lineTotal,
                                    bid.currency,
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                MOQ
                            </dt>
                            <dd className="mt-1 font-medium text-slate-900">
                                {quote.minimumOrderQuantity}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                Lead time
                            </dt>
                            <dd className="mt-1 font-medium text-slate-900">
                                {quote.leadTimeDays} days
                            </dd>
                        </div>
                    </dl>

                    {quote.notes && (
                        <p className="mt-4 text-sm text-slate-600">
                            Quote note: {quote.notes}
                        </p>
                    )}
                </div>
            ) : (
                <p className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-500">
                    No commercial terms are available for this line item.
                </p>
            )}

            {bid.notes && (
                <p className="mt-4 text-sm text-slate-600">
                    Bid note: {bid.notes}
                </p>
            )}
        </article>
    );
}