import type {
    AwardPlanPartnerGroup,
    AwardPlanResult,
} from "@/domain/award-plan";
import { formatMoney } from "@/lib/formatters";

type AwardSummaryProps = {
    result: AwardPlanResult | null;
};

type CostBreakdownProps = {
    currency: string;
    partners: AwardPlanPartnerGroup[];
    mode: "preview" | "final";
};

function CostBreakdown({
    currency,
    partners,
    mode,
}: CostBreakdownProps) {
    // Domain totals are rendered directly here. The UI formats money
    // but does not recompute commercial rules.
    return (
        <div className="mt-6 space-y-4">
            {partners.map((partner) => (
                <article
                    key={partner.partnerId}
                    aria-labelledby={`award-partner-${partner.partnerId}`}
                    className={`rounded-lg border bg-white p-5 ${
                        mode === "final"
                            ? "border-emerald-200"
                            : "border-slate-200"
                    }`}
                >
                    <div>
                        <h3
                            id={`award-partner-${partner.partnerId}`}
                            className="text-lg font-semibold text-slate-950"
                        >
                            {partner.partnerName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {partner.country} ·{" "}
                            {partner.partnerId}
                        </p>
                    </div>

                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                        <div>
                            <dt className="text-slate-500">
                                Line items subtotal
                            </dt>
                            <dd className="mt-1 font-medium text-slate-950">
                                {formatMoney(
                                    partner.lineItemsSubtotal,
                                    currency,
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                Shipping
                            </dt>
                            <dd className="mt-1 font-medium text-slate-950">
                                {formatMoney(
                                    partner.shippingTotal,
                                    currency,
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                {mode === "preview"
                                    ? "Current partner total"
                                    : "Partner total"}
                            </dt>
                            <dd className="mt-1 font-semibold text-slate-950">
                                {formatMoney(
                                    partner.partnerTotal,
                                    currency,
                                )}
                            </dd>
                        </div>
                    </dl>
                    <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
                        {partner.bids.map((bid) => (
                            <section
                                key={bid.bidId}
                                aria-labelledby={`award-bid-${partner.partnerId}-${bid.bidId}`}
                                className="rounded-lg bg-slate-50 p-4"
                            >
                                <h4
                                    id={`award-bid-${partner.partnerId}-${bid.bidId}`}
                                    className="font-semibold text-slate-950"
                                >
                                    Bid {bid.bidId}
                                </h4>

                                {/*
                                    Shipping belongs to the bid group rather than individual
                                    line items, so it is presented only once here.
                                */}
                                <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
                                    <div>
                                        <dt className="text-slate-500">
                                            Line items subtotal
                                        </dt>
                                        <dd className="mt-1 font-medium text-slate-950">
                                            {formatMoney(
                                                bid.lineItemsSubtotal,
                                                currency,
                                            )}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-slate-500">
                                            Shipping once per bid
                                        </dt>
                                        <dd className="mt-1 font-medium text-slate-950">
                                            {formatMoney(
                                                bid.shippingFee,
                                                currency,
                                            )}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-slate-500">
                                            {mode === "preview"
                                                ? "Current bid total"
                                                : "Bid total"}
                                        </dt>
                                        <dd className="mt-1 font-semibold text-slate-950">
                                            {formatMoney(
                                                bid.bidTotal,
                                                currency,
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                {/*
                                    AwardPlan is a display-ready projection. The domain has already
                                    joined the selected records, so this component does not query
                                    the source dataset again.
                                */}
                                <ul className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
                                    {bid.lineItems.map((lineItem) => (
                                        <li
                                            key={lineItem.lineItemId}
                                            className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
                                        >
                                            <div>
                                                <p className="font-medium text-slate-950">
                                                    {lineItem.partNumber}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {lineItem.lineItemId} ·{" "}
                                                    {lineItem.quantity} units ·{" "}
                                                    {lineItem.leadTimeDays} days
                                                </p>
                                            </div>

                                            <dl className="grid gap-3 text-sm sm:grid-cols-3">
                                                <div>
                                                    <dt className="text-slate-500">
                                                        Unit price
                                                    </dt>
                                                    <dd className="mt-1 text-slate-950">
                                                        {formatMoney(
                                                            lineItem.unitPrice,
                                                            currency,
                                                            3,
                                                        )}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-slate-500">
                                                        Setup fee
                                                    </dt>
                                                    <dd className="mt-1 text-slate-950">
                                                        {formatMoney(
                                                            lineItem.setupFee,
                                                            currency,
                                                        )}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-slate-500">
                                                        Line total
                                                    </dt>
                                                    <dd className="mt-1 font-semibold text-slate-950">
                                                        {formatMoney(
                                                            lineItem.lineTotal,
                                                            currency,
                                                        )}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                </article>
            ))}
        </div>
    );
}

export function AwardSummary({
    result,
}: AwardSummaryProps) {
    if (result === null) {
        return null;
    }

    switch (result.complete) {
        case false: {
            const hasPreview =
                result.preview.partners.length > 0;

            return (
                <section
                    aria-labelledby="award-summary-heading"
                    className="mt-10 rounded-xl border border-slate-200 bg-white p-6"
                >
                    <h2
                        id="award-summary-heading"
                        className="text-2xl font-semibold text-slate-950"
                    >
                        {hasPreview
                            ? "Draft cost preview"
                            : "Award summary"}
                    </h2>
                    <p className="mt-3 text-sm text-slate-600">
                        {hasPreview
                            ? "This preview includes current valid selections only. Final award plan is not available yet."
                            : "A complete award plan requires one eligible selection for every line item."}
                    </p>
                    {hasPreview && (
                        <div className="mt-4">
                            <p className="text-sm text-slate-600">
                                Current draft total
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">
                                {formatMoney(
                                    result.preview.currentTotal,
                                    result.preview.currency,
                                )}
                            </p>
                        </div>
                    )}

                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                        {result.missingLineItemIds.length > 0 && (
                            <li>
                                {result.missingLineItemIds.length}{" "}
                                {result.missingLineItemIds.length === 1
                                    ? "line item still needs"
                                    : "line items still need"}{" "}
                                a selection.
                            </li>
                        )}

                        {result.invalidSelections.length > 0 && (
                            <li>
                                {result.invalidSelections.length} saved{" "}
                                {result.invalidSelections.length === 1
                                    ? "selection must"
                                    : "selections must"}{" "}
                                be reviewed.
                            </li>
                        )}
                    </ul>
                    {hasPreview && (
                        <CostBreakdown
                            currency={result.preview.currency}
                            partners={result.preview.partners}
                            mode="preview"
                        />
                    )}
                </section>
            );
        }

        case true: {
            const { plan } = result;

            return (
                <section
                    aria-labelledby="award-summary-heading"
                    className="mt-10 rounded-xl border border-emerald-200 bg-emerald-50 p-6"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2
                                id="award-summary-heading"
                                className="text-2xl font-semibold text-slate-950"
                            >
                                Award summary
                            </h2>
                            <p className="mt-2 text-sm text-emerald-800">
                                The award plan is complete.
                            </p>
                        </div>

                        <div className="sm:text-right">
                            <p className="text-sm text-slate-600">
                                Grand total
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">
                                {formatMoney(
                                    plan.grandTotal,
                                    plan.currency,
                                )}
                            </p>
                        </div>
                    </div>
                    <CostBreakdown
                        currency={plan.currency}
                        partners={plan.partners}
                        mode="final"
                    />
                </section>
            );
        }
    }

    const exhaustiveCheck: never = result;
    return exhaustiveCheck;
}
