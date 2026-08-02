import { describe, expect, it } from "vitest";
import { loadCaseStudy } from "@/data/load-case-study";
import { evaluateBidEligibility, evaluateQuoteEligibility } from "@/domain/eligibility";

const loadResult = loadCaseStudy();

if (!loadResult.success) {
    throw new Error("Test fixture could not be loaded");
}

const caseStudy = loadResult.data;

describe("evaluateBidEligibility", () => {
    it("accepts submitted bid with valid evaluation timestamp", () => {
        const bid = caseStudy.bids.find((b) => b.id === "BID-001");
        if (!bid) {
            throw new Error("Test fixture is missing BID-001");
        }

        const result = evaluateBidEligibility(bid, caseStudy.metadata.evaluationTimestamp);
        expect(result).toStrictEqual({ eligible: true, issues: [] });
    });

    it("reports issues for expired bid", () => {
        const bid = caseStudy.bids.find((b) => b.id === "BID-004");
        if (!bid) {
            throw new Error("Test fixture is missing BID-004");
        }

        const result = evaluateBidEligibility(bid, caseStudy.metadata.evaluationTimestamp);
        expect(result).toStrictEqual({
            eligible: false,
            issues: [
                {
                    code: "BID_EXPIRED",
                    evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
                    validUntil: bid.validUntil,
                }
            ]
        });
    });

    it("reports issues for withdrawn bid", () => {
        const bid = caseStudy.bids.find((b) => b.id === "BID-005");
        if (!bid) {
            throw new Error("Test fixture is missing BID-005");
        }

        const result = evaluateBidEligibility(bid, caseStudy.metadata.evaluationTimestamp);
        expect(result).toStrictEqual({
            eligible: false,
            issues: [
                {
                    code: "BID_NOT_SUBMITTED",
                    status: bid.status,
                }
            ]
        });
    });

    it("reports every issue for a withdrawn and expired bid", () => {
        const bid = caseStudy.bids.find((b) => b.id === "BID-005");
        if (!bid) {
            throw new Error("Test fixture is missing BID-005");
        }

        const withdrawnAndExpiredBid = {
            ...bid,
            validUntil: caseStudy.metadata.evaluationTimestamp,
        };

        const result = evaluateBidEligibility(withdrawnAndExpiredBid, caseStudy.metadata.evaluationTimestamp);
        expect(result).toStrictEqual({
            eligible: false,
            issues: [
                {
                    code: "BID_NOT_SUBMITTED",
                    status: bid.status,
                },
                {
                    code: "BID_EXPIRED",
                    evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
                    validUntil: caseStudy.metadata.evaluationTimestamp,
                }
            ]
        });
    });
});

describe("evaluateQuoteEligibility", () => {
    it("accepts an eligible quote", () => {
        const bid = caseStudy.bids.find(
            (candidate) => candidate.id === "BID-001",
        );
        if (!bid) {
            throw new Error("Expected BID-001 in test fixture");
        }

        const lineItem = caseStudy.rfq.lineItems.find(
            (candidate) => candidate.id === "LI-001",
        );
        if (!lineItem) {
            throw new Error("Expected LI-001 in test fixture");
        }

        const quote = bid.lineItemQuotes.find(
            (candidate) => candidate.lineItemId === lineItem.id,
        );
        if (!quote) {
            throw new Error("Expected quote for LI-001 in test fixture");
        }

        const result = evaluateQuoteEligibility({
            bid,
            quote,
            lineItem,
            evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
        });

        expect(result).toStrictEqual({ eligible: true, issues: [] });
    });

    it("reports a missing quote and its ineligible parent bid", () => {
        const bid = caseStudy.bids.find(
            (candidate) => candidate.id === "BID-005",
        );
        if (!bid) {
            throw new Error("Expected BID-005 in test fixture");
        }

        const lineItem = caseStudy.rfq.lineItems.find(
            (candidate) => candidate.id === "LI-004",
        );
        if (!lineItem) {
            throw new Error("Expected LI-004 in test fixture");
        }

        const quote = bid.lineItemQuotes.find(
            (candidate) => candidate.lineItemId === lineItem.id,
        );

        expect(quote).toBeUndefined();

        const result = evaluateQuoteEligibility({
            bid,
            quote,
            lineItem,
            evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
        });

        expect(result).toStrictEqual(
            {
                eligible: false,
                issues: [
                    {
                        code: "BID_NOT_SUBMITTED",
                        status: "WITHDRAWN",
                    },
                    {
                        code: "MISSING_QUOTE",
                        bidId: "BID-005",
                        lineItemId: "LI-004",
                    },
                ],
            }
        );
    });

    it("reports an eligible quote whose parent bid has expired", () => {
        const bid = caseStudy.bids.find(
            (candidate) => candidate.id === "BID-004",
        );
        if (!bid) {
            throw new Error("Expected BID-004 in test fixture");
        }

        const lineItem = caseStudy.rfq.lineItems.find(
            (candidate) => candidate.id === "LI-001",
        );
        if (!lineItem) {
            throw new Error("Expected LI-001 in test fixture");
        }

        const quote = bid.lineItemQuotes.find(
            (candidate) => candidate.lineItemId === lineItem.id,
        );
        if (!quote) {
            throw new Error("Expected quote for LI-001 in test fixture");
        }

        const result = evaluateQuoteEligibility({
            bid,
            quote,
            lineItem,
            evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
        });

        expect(result).toStrictEqual(
            {
                eligible: false,
                issues: [
                    {
                        code: "BID_EXPIRED",
                        evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
                        validUntil: bid.validUntil,
                    },
                ],
            }
        );
    });

    it("reports every invalid monetary field", () => {
        const bid = caseStudy.bids.find(
            (candidate) => candidate.id === "BID-001",
        );
        if (!bid) {
            throw new Error("Expected BID-001 in test fixture");
        }

        const lineItem = caseStudy.rfq.lineItems.find(
            (candidate) => candidate.id === "LI-001",
        );
        if (!lineItem) {
            throw new Error("Expected LI-001 in test fixture");
        }

        const quote = bid.lineItemQuotes.find(
            (candidate) => candidate.lineItemId === lineItem.id,
        );
        if (!quote) {
            throw new Error("Expected quote for LI-001 in test fixture");
        }

        const quoteWithInvalidMoney = {
            ...quote,
            unitPrice: 0,
            setupFee: -1,
        };

        const result = evaluateQuoteEligibility({
            bid,
            quote: quoteWithInvalidMoney,
            lineItem,
            evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
        });

        expect(result).toStrictEqual(
            {
                eligible: false,
                issues: [
                    {
                        code: "INVALID_UNIT_PRICE",
                        unitPrice: 0,
                    },
                    {
                        code: "INVALID_SETUP_FEE",
                        setupFee: -1,
                    },
                ],
            }
        );
    });

    it("reports an MOQ above the requested quantity", () => {
        const bid = caseStudy.bids.find(
            (candidate) => candidate.id === "BID-002",
        );
        if (!bid) {
            throw new Error("Expected BID-002 in test fixture");
        }

        const lineItem = caseStudy.rfq.lineItems.find(
            (candidate) => candidate.id === "LI-004",
        );
        if (!lineItem) {
            throw new Error("Expected LI-004 in test fixture");
        }

        const quote = bid.lineItemQuotes.find(
            (candidate) => candidate.lineItemId === lineItem.id,
        );
        if (!quote) {
            throw new Error("Expected quote for LI-004 in test fixture");
        }

        const result = evaluateQuoteEligibility({
            bid,
            quote,
            lineItem,
            evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
        });

        expect(result).toStrictEqual(
            {
                eligible: false,
                issues: [
                    {
                        code: "MOQ_EXCEEDS_QUANTITY",
                        minimumOrderQuantity: quote.minimumOrderQuantity,
                        quantity: lineItem.quantity,
                    },
                ],
            }
        );
    });

    it("reports a lead time above the requirement", () => {
        const bid = caseStudy.bids.find(
            (candidate) => candidate.id === "BID-002",
        );
        if (!bid) {
            throw new Error("Expected BID-002 in test fixture");
        }

        const lineItem = caseStudy.rfq.lineItems.find(
            (candidate) => candidate.id === "LI-003",
        );
        if (!lineItem) {
            throw new Error("Expected LI-003 in test fixture");
        }

        const quote = bid.lineItemQuotes.find(
            (candidate) => candidate.lineItemId === lineItem.id,
        );
        if (!quote) {
            throw new Error("Expected quote for LI-003 in test fixture");
        }

        const result = evaluateQuoteEligibility({
            bid,
            quote,
            lineItem,
            evaluationTimestamp: caseStudy.metadata.evaluationTimestamp,
        });

        expect(result).toStrictEqual(
            {
                eligible: false,
                issues: [
                    {
                        code: "LEAD_TIME_EXCEEDS_REQUIREMENT",
                        leadTimeDays: quote.leadTimeDays,
                        requiredLeadTimeDays: lineItem.requiredLeadTimeDays,
                    },
                ],
            }
        );
    });
});