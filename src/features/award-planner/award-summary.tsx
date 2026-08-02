import type {
    AwardPlanResult,
} from "@/domain/award-plan";
import { formatMoney } from "@/lib/formatters";

type AwardSummaryProps = {
    result: AwardPlanResult | null;
};

export function AwardSummary({
    result,
}: AwardSummaryProps) {
    if (result === null) {
        return null;
    }

    switch (result.complete) {
        case false:
            return (
                <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="text-2xl font-semibold text-slate-950">
                        Award summary
                    </h2>
                    <p className="mt-3 text-sm text-slate-600">
                        A complete award plan requires one eligible
                        selection for every line item.
                    </p>

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
                </section>
            );

        case true: {
            const { plan } = result;

            return (
                <section className="mt-10 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-950">
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

                    {/* 
                        Domain totals are rendered directly here. The UI formats money
                        but does not recompute commercial rules. 
                    */}
                    <div className="mt-6 space-y-4">
                        {plan.partners.map((partner) => (
                            <article
                                key={partner.partnerId}
                                className="rounded-lg border border-emerald-200 bg-white p-5"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-950">
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
                                                plan.currency,
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
                                                plan.currency,
                                            )}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-slate-500">
                                            Partner total
                                        </dt>
                                        <dd className="mt-1 font-semibold text-slate-950">
                                            {formatMoney(
                                                partner.partnerTotal,
                                                plan.currency,
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
                                    {partner.bids.map((bid) => (
                                        <section
                                            key={bid.bidId}
                                            className="rounded-lg bg-slate-50 p-4"
                                        >
                                            <h4 className="font-semibold text-slate-950">
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
                                                            plan.currency,
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
                                                            plan.currency,
                                                        )}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-slate-500">
                                                        Bid total
                                                    </dt>
                                                    <dd className="mt-1 font-semibold text-slate-950">
                                                        {formatMoney(
                                                            bid.bidTotal,
                                                            plan.currency,
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
                                                                        plan.currency,
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
                                                                        plan.currency,
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
                                                                        plan.currency,
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
                </section>
            );
        }
    }

    const exhaustiveCheck: never = result;
    return exhaustiveCheck;
}