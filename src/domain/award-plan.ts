import Decimal from "decimal.js";
import {
    calculateLineItemTotal,
    toMoneyNumber,
} from "./money";
import {
    validateDraftSelections,
    type DraftSelections,
    type InvalidSelection,
} from "./selections";
import type { Bid, CaseStudy, LineItemQuote, Partner, RfqLineItem } from "./schemas";

export type AwardPlanLineItem = {
    lineItemId: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    setupFee: number;
    leadTimeDays: number;
    lineTotal: number;
};

export type AwardPlanBidGroup = {
    bidId: string;
    lineItems: AwardPlanLineItem[];
    lineItemsSubtotal: number;
    shippingFee: number;
    bidTotal: number;
};

export type AwardPlanPartnerGroup = {
    partnerId: string;
    partnerName: string;
    country: string;
    bids: AwardPlanBidGroup[];
    lineItemsSubtotal: number;
    shippingTotal: number;
    partnerTotal: number;
};

export type AwardPlan = {
    rfqId: string;
    evaluationTimestamp: string;
    currency: string;
    partners: AwardPlanPartnerGroup[];
    grandTotal: number;
};

export type AwardPlanPreview = {
    currency: string;
    partners: AwardPlanPartnerGroup[];
    currentTotal: number;
};

export type AwardPlanResult =
    | {
        complete: false;
        preview: AwardPlanPreview;
        missingLineItemIds: string[];
        invalidSelections: InvalidSelection[];
    }
    | {
        complete: true;
        plan: AwardPlan;
    };

type SelectedAwardRow = {
    lineItem: RfqLineItem,
    bid: Bid,
    quote: LineItemQuote,
    partner: Partner,
    lineTotal: Decimal
};

export function buildAwardPlan(
    data: CaseStudy,
    selections: DraftSelections,
): AwardPlanResult {
    const { missingLineItemIds, invalidSelections, validSelections } = validateDraftSelections(data, selections);

    const selectedRows: SelectedAwardRow[] = [];

    for (const lineItem of data.rfq.lineItems) {
        const lineItemId = lineItem.id;
        const bidId = validSelections[lineItemId];

        if (bidId === undefined) {
            continue;
        }

        const bid = data.bids.find(b => b.id === bidId);
        if (!bid) {
            throw new Error(`Bid with ID ${bidId} not found in case study.`);
        }

        const quote = bid.lineItemQuotes.find(q => q.lineItemId === lineItemId);
        if (!quote) {
            throw new Error(`Quote for line item ID ${lineItemId} not found in bid ID ${bidId}.`);
        }

        const partner = data.partners.find(p => p.id === bid.partnerId);
        if (!partner) {
            throw new Error(`Partner with ID ${bid.partnerId} not found in case study.`);
        }

        const lineTotalDecimal = calculateLineItemTotal({
            unitPrice: quote.unitPrice,
            quantity: lineItem.quantity,
            setupFee: quote.setupFee,
        });

        selectedRows.push({
            lineItem,
            bid,
            quote,
            partner,
            lineTotal: lineTotalDecimal,
        });
    }

    const selectedPartnerIds = [
        ...new Set(
            selectedRows.map((row) => row.partner.id),
        ),
    ];

    const partnerBuckets = selectedPartnerIds.map((partnerId) => {
        const partnerRows = selectedRows.filter(
            (row) => row.partner.id === partnerId,
        );

        const partner = partnerRows[0]?.partner;
        if (!partner) {
            throw new Error(`Partner with ID ${partnerId} not found in case study.`);
        }

        const selectedBidIds = [
            ...new Set(
                partnerRows.map((row) => row.bid.id),
            ),
        ];

        const bidBuckets = selectedBidIds.map((bidId) => {
            const bidRows = partnerRows.filter(
                (row) => row.bid.id === bidId,
            );

            const bid = bidRows[0]?.bid;
            if (!bid) {
                throw new Error(`Bid with ID ${bidId} not found in case study.`);
            }

            return {
                bid,
                rows: bidRows,
            };
        });

        return {
            partner,
            bidBuckets,
        };
    });

    const partnerResults = partnerBuckets.map(({ partner, bidBuckets }) => {
        const bidResults = bidBuckets.map(({ bid, rows: bidRows }) => {
            const lineItems = bidRows.map((row) => ({
                lineItemId: row.lineItem.id,
                partNumber: row.lineItem.partNumber,
                quantity: row.lineItem.quantity,
                unitPrice: row.quote.unitPrice,
                setupFee: row.quote.setupFee,
                leadTimeDays: row.quote.leadTimeDays,
                lineTotal: toMoneyNumber(row.lineTotal),
            }));

            const lineItemsSubtotal = bidRows.reduce(
                (acc, row) => acc.plus(row.lineTotal),
                new Decimal(0),
            );

            const shippingFee = new Decimal(bid.shippingFee);

            // Shipping fee is charged once per selected bid, so we only add it once for each bid, regardless of the number of line items.
            const bidTotal = lineItemsSubtotal.plus(shippingFee);

            const group: AwardPlanBidGroup = {
                bidId: bid.id,
                lineItems,
                lineItemsSubtotal: toMoneyNumber(lineItemsSubtotal),
                shippingFee: toMoneyNumber(shippingFee),
                bidTotal: toMoneyNumber(bidTotal),
            };

            return {
                group,
                lineItemsSubtotal,
                shippingFee,
            };
        });

        const lineItemsSubtotal = bidResults.reduce(
            (sum, bidResult) =>
                sum.plus(bidResult.lineItemsSubtotal),
            new Decimal(0),
        );

        const shippingTotal = bidResults.reduce(
            (sum, bidResult) =>
                sum.plus(bidResult.shippingFee),
            new Decimal(0),
        );

        const partnerTotal = lineItemsSubtotal.plus(
            shippingTotal,
        );

        const group: AwardPlanPartnerGroup = {
            partnerId: partner.id,
            partnerName: partner.name,
            country: partner.country,
            bids: bidResults.map(
                (bidResult) => bidResult.group,
            ),
            lineItemsSubtotal: toMoneyNumber(lineItemsSubtotal),
            shippingTotal: toMoneyNumber(shippingTotal),
            partnerTotal: toMoneyNumber(partnerTotal),
        };

        return {
            group,
            partnerTotal,
        }
    });

    const grandTotal = partnerResults.reduce(
        (sum, partnerResult) =>
            sum.plus(partnerResult.partnerTotal),
        new Decimal(0),
    );

    const partners = partnerResults.map(
        (partnerResult) => partnerResult.group,
    );

    if (
        invalidSelections.length > 0 ||
        missingLineItemIds.length > 0
    ) {
        return {
            complete: false,
            preview: {
                currency: data.metadata.baseCurrency,
                partners,
                currentTotal: toMoneyNumber(grandTotal),
            },
            missingLineItemIds,
            invalidSelections,
        };
    }

    return {
        complete: true,
        plan: {
            rfqId: data.rfq.id,
            evaluationTimestamp:
                data.metadata.evaluationTimestamp,
            currency: data.metadata.baseCurrency,
            partners,
            grandTotal: toMoneyNumber(grandTotal),
        },
    };
}