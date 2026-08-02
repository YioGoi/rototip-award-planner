import {
    evaluateQuoteEligibility,
} from "@/domain/eligibility";
import type {
    Bid,
    Partner,
    RfqLineItem,
} from "@/domain/schemas";

import { QuoteOption } from "./quote-option";

type LineItemSectionProps = {
    lineItem: RfqLineItem;
    bids: Bid[];
    partners: Partner[];
    evaluationTimestamp: string;
    selectedBidId: string | undefined;
    hasHydrated: boolean;
    onSelectBid: (bidId: string) => void;
    onClearSelection: () => void;
};

export function LineItemSection({
    lineItem,
    bids,
    partners,
    evaluationTimestamp,
    selectedBidId,
    hasHydrated,
    onSelectBid,
    onClearSelection,
}: LineItemSectionProps) {
    return (
        <section
            aria-labelledby={`line-item-${lineItem.id}`}
            className="rounded-2xl bg-slate-50 p-6"
        >
            <header>
                <p className="text-sm font-medium text-slate-500">
                    {lineItem.partNumber}
                </p>
                <h2
                    id={`line-item-${lineItem.id}`}
                    className="mt-1 text-2xl font-semibold text-slate-950"
                >
                    {lineItem.name}
                </h2>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <dt className="text-slate-500">
                            Quantity
                        </dt>
                        <dd className="mt-1 font-medium text-slate-900">
                            {lineItem.quantity} units
                        </dd>
                    </div>

                    <div>
                        <dt className="text-slate-500">
                            Required lead time
                        </dt>
                        <dd className="mt-1 font-medium text-slate-900">
                            {lineItem.requiredLeadTimeDays} days
                        </dd>
                    </div>

                    <div>
                        <dt className="text-slate-500">
                            Process
                        </dt>
                        <dd className="mt-1 font-medium text-slate-900">
                            {lineItem.manufacturingProcess}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-slate-500">
                            Material
                        </dt>
                        <dd className="mt-1 font-medium text-slate-900">
                            {lineItem.material}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-slate-500">
                            Drawing
                        </dt>
                        <dd className="mt-1 font-medium text-slate-900">
                            {lineItem.drawingFileName}
                        </dd>
                    </div>
                </dl>
                {hasHydrated && selectedBidId && (
                    <button
                        type="button"
                        onClick={onClearSelection}
                        className="mt-5 text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                        Clear selection
                    </button>
                )}
            </header>

            <fieldset className="mt-6 min-w-0 border-0 p-0">
                <legend className="sr-only">
                    {lineItem.name} award options
                </legend>
                <div className="grid gap-4 lg:grid-cols-2">
                    {bids.map((bid) => {
                        const partner = partners.find(
                            (candidate) =>
                                candidate.id === bid.partnerId,
                        );

                        // Dataset integrity is validated on the server before this component renders.
                        // Reaching this branch means that a validated relationship invariant was broken,
                        // so fail loudly instead of silently hiding a bid from the comparison.
                        if (!partner) {
                            throw new Error(
                                `Validated dataset is missing partner ${bid.partnerId}.`,
                            );
                        }

                        // Keep every bid visible for a complete comparison, even when it has no quote
                        // for this line item. A missing quote is meaningful domain input, so pass
                        // `undefined` to eligibility instead of filtering out the card.
                        const quote = bid.lineItemQuotes.find(
                            (candidate) =>
                                candidate.lineItemId === lineItem.id,
                        );

                        const eligibilityResult =
                            evaluateQuoteEligibility({
                                bid,
                                quote,
                                lineItem,
                                evaluationTimestamp,
                            });

                        return (
                            <QuoteOption
                                key={bid.id}
                                partner={partner}
                                bid={bid}
                                lineItem={lineItem}
                                quote={quote}
                                eligibilityResult={
                                    eligibilityResult
                                }
                                selected={selectedBidId === bid.id}
                                disabled={
                                    !hasHydrated ||
                                    !eligibilityResult.eligible
                                }
                                onSelect={() => {
                                    onSelectBid(bid.id);
                                }}
                            />
                        );
                    })}
                </div>
            </fieldset>
        </section>
    );
}
