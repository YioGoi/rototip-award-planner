import type {
    Bid,
    LineItemQuote,
    RfqLineItem,
} from "./schemas";

export type EligibilityIssue =
    | {
        code: "BID_NOT_SUBMITTED";
        status: Bid["status"];
    }
    | {
        code: "BID_EXPIRED";
        evaluationTimestamp: string;
        validUntil: string;
    }
    | {
        code: "MISSING_QUOTE";
        bidId: string;
        lineItemId: string;
    }
    | {
        code: "INVALID_UNIT_PRICE";
        unitPrice: number;
    }
    | {
        code: "INVALID_SETUP_FEE";
        setupFee: number;
    }
    | {
        code: "MOQ_EXCEEDS_QUANTITY";
        minimumOrderQuantity: number;
        quantity: number;
    }
    | {
        code: "LEAD_TIME_EXCEEDS_REQUIREMENT";
        leadTimeDays: number;
        requiredLeadTimeDays: number;
    };

export type EligibilityResult =
    | { eligible: true; issues: [] }
    | {
        eligible: false;
        issues: EligibilityIssue[];
    };

export type EvaluateQuoteEligibilityInput = {
    bid: Bid;
    quote: LineItemQuote | undefined;
    lineItem: RfqLineItem;
    evaluationTimestamp: string;
};

export function evaluateBidEligibility(
    bid: Bid,
    evaluationTimestamp: string,
): EligibilityResult {
    const issues: EligibilityIssue[] = [];

    if (bid.status !== "SUBMITTED") {
        issues.push({
            code: "BID_NOT_SUBMITTED",
            status: bid.status,
        });
    }

    // `validUntil` marks the first instant at which the bid is expired.
    // Therefore, equality falls outside the validity window.
    if (Date.parse(evaluationTimestamp) >= Date.parse(bid.validUntil)) {
        issues.push({
            code: "BID_EXPIRED",
            evaluationTimestamp,
            validUntil: bid.validUntil,
        });
    }

    if (issues.length === 0) {
        return { eligible: true, issues: [] };
    }

    return { eligible: false, issues };
}

export function evaluateQuoteEligibility(
    input: EvaluateQuoteEligibilityInput,
): EligibilityResult {
    const { bid, quote, lineItem, evaluationTimestamp } = input;

    const bidResult = evaluateBidEligibility(
        bid,
        evaluationTimestamp,
    );

    const issues: EligibilityIssue[] = [...bidResult.issues];

    if (quote === undefined) {
        issues.push({
            code: "MISSING_QUOTE",
            bidId: bid.id,
            lineItemId: lineItem.id,
        });
        return { eligible: false, issues };
    }

    if (quote.unitPrice <= 0) {
        issues.push({
            code: "INVALID_UNIT_PRICE",
            unitPrice: quote.unitPrice,
        });
    }

    if (quote.setupFee < 0) {
        issues.push({
            code: "INVALID_SETUP_FEE",
            setupFee: quote.setupFee,
        });
    }

    if (quote.minimumOrderQuantity > lineItem.quantity) {
        issues.push({
            code: "MOQ_EXCEEDS_QUANTITY",
            minimumOrderQuantity: quote.minimumOrderQuantity,
            quantity: lineItem.quantity,
        });
    }

    if (quote.leadTimeDays > lineItem.requiredLeadTimeDays) {
        issues.push({
            code: "LEAD_TIME_EXCEEDS_REQUIREMENT",
            leadTimeDays: quote.leadTimeDays,
            requiredLeadTimeDays: lineItem.requiredLeadTimeDays,
        });
    }

    return issues.length === 0 ?
        { eligible: true, issues: [] } :
        { eligible: false, issues };
}
