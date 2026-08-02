import type { CaseStudy } from "./schemas";

export type DatasetIntegrityIssue =
    | { code: "DUPLICATE_PARTNER_ID"; partnerId: string }
    | { code: "DUPLICATE_LINE_ITEM_ID"; lineItemId: string }
    | { code: "DUPLICATE_BID_ID"; bidId: string }
    | {
        code: "UNKNOWN_PARTNER";
        bidId: string;
        partnerId: string;
    }
    | {
        code: "UNKNOWN_LINE_ITEM";
        bidId: string;
        lineItemId: string;
    }
    | {
        code: "DUPLICATE_QUOTE";
        bidId: string;
        lineItemId: string;
    }
    | {
        code: "CURRENCY_MISMATCH";
        bidId: string;
        currency: string;
        baseCurrency: string;
    };


export type DatasetIntegrityResult =
    | { valid: true; issues: [] }
    | {
        valid: false;
        issues: DatasetIntegrityIssue[];
    };


export function validateDatasetIntegrity(
    data: CaseStudy,
): DatasetIntegrityResult {
    const seenPartnerIds = new Set<string>();
    const seenLineItemIds = new Set<string>();
    const seenBidIds = new Set<string>();
    const issues: DatasetIntegrityIssue[] = [];
    for (const partner of data.partners) {
        if (!seenPartnerIds.has(partner.id)) {
            seenPartnerIds.add(partner.id);
        } else {
            issues.push({
                code: "DUPLICATE_PARTNER_ID",
                partnerId: partner.id,
            });
        }
    }

    for (const lineItem of data.rfq.lineItems) {
        if (!seenLineItemIds.has(lineItem.id)) {
            seenLineItemIds.add(lineItem.id);
        } else {
            issues.push({
                code: "DUPLICATE_LINE_ITEM_ID",
                lineItemId: lineItem.id,
            });
        }
    }

    for (const bid of data.bids) {
        if (!seenBidIds.has(bid.id)) {
            seenBidIds.add(bid.id);
        } else {
            issues.push({
                code: "DUPLICATE_BID_ID",
                bidId: bid.id,
            });
        }

        if (!seenPartnerIds.has(bid.partnerId)) {
            issues.push({
                code: "UNKNOWN_PARTNER",
                bidId: bid.id,
                partnerId: bid.partnerId,
            });
        }

        const seenQuoteLineItemIds = new Set<string>();

        for (const quote of bid.lineItemQuotes) {
            if (!seenLineItemIds.has(quote.lineItemId)) {
                issues.push({
                    code: "UNKNOWN_LINE_ITEM",
                    bidId: bid.id,
                    lineItemId: quote.lineItemId,
                });
            }

            if (seenQuoteLineItemIds.has(quote.lineItemId)) {
                issues.push({
                    code: "DUPLICATE_QUOTE",
                    bidId: bid.id,
                    lineItemId: quote.lineItemId,
                });
            } else {
                seenQuoteLineItemIds.add(quote.lineItemId);
            }
        }

        if (bid.currency !== data.metadata.baseCurrency) {
            issues.push({
                code: "CURRENCY_MISMATCH",
                bidId: bid.id,
                currency: bid.currency,
                baseCurrency: data.metadata.baseCurrency,
            });
        }
    }

    return issues.length === 0 ?
        { valid: true, issues: [] } :
        { valid: false, issues };
}