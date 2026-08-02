import type { CaseStudy } from "./schemas";
import {
    evaluateQuoteEligibility,
    type EligibilityIssue,
} from "./eligibility";

export type DraftSelections = Record<string, string>;

export type InvalidSelection =
    | {
        code: "SELECTION_LINE_ITEM_NOT_FOUND";
        lineItemId: string;
        bidId: string;
    }
    | {
        code: "SELECTION_BID_NOT_FOUND";
        lineItemId: string;
        bidId: string;
    }
    | {
        code: "SELECTION_QUOTE_INELIGIBLE";
        lineItemId: string;
        bidId: string;
        issues: EligibilityIssue[];
    };

export type ValidatedSelectionsResult = {
    validSelections: DraftSelections;
    missingLineItemIds: string[];
    invalidSelections: InvalidSelection[];
};

export function validateDraftSelections(
    data: CaseStudy,
    selections: DraftSelections,
): ValidatedSelectionsResult {
    const validSelections: DraftSelections = {};
    const missingLineItemIds: string[] = [];
    const invalidSelections: InvalidSelection[] = [];

    for (const [lineItemId, bidId] of Object.entries(selections)) {
        const lineItem = data.rfq.lineItems.find(
            (candidate) => candidate.id === lineItemId,
        );

        if (!lineItem) {
            invalidSelections.push({
                code: "SELECTION_LINE_ITEM_NOT_FOUND",
                lineItemId,
                bidId,
            });
            continue;
        }

        const bid = data.bids.find(
            (candidate) => candidate.id === bidId,
        );

        if (!bid) {
            invalidSelections.push({
                code: "SELECTION_BID_NOT_FOUND",
                lineItemId,
                bidId,
            });
            continue;
        }

        const quote = bid.lineItemQuotes.find(
            (candidate) => candidate.lineItemId === lineItemId,
        );

        // Browser storage is not trusted and dataset or eligibility conditions may change between sessions.
        // Therefore, revalidation prevents stale/ineligible selections from entering the award plan.
        const eligibilityResult = evaluateQuoteEligibility({
            bid,
            quote,
            lineItem,
            evaluationTimestamp: data.metadata.evaluationTimestamp,
        });

        if (eligibilityResult.eligible) {
            validSelections[lineItemId] = bidId;
        } else {
            invalidSelections.push({
                code: "SELECTION_QUOTE_INELIGIBLE",
                lineItemId,
                bidId,
                issues: eligibilityResult.issues,
            });
        }
    }

    for (const lineItem of data.rfq.lineItems) {
        if (!Object.hasOwn(selections, lineItem.id)) {
            missingLineItemIds.push(lineItem.id);
        }
    }

    return {
        validSelections,
        missingLineItemIds,
        invalidSelections,
    };
}