import { describe, expect, it } from "vitest";
import { loadCaseStudy } from "@/data/load-case-study";
import { validateDatasetIntegrity } from "@/domain/dataset-integrity";

const loadResult = loadCaseStudy();

if (!loadResult.success) {
    throw new Error("Test fixture could not be loaded");
}

const caseStudy = loadResult.data;

describe("validateDatasetIntegrity", () => {
    it("accepts the supplied case study", () => {
        expect(validateDatasetIntegrity(caseStudy)).toStrictEqual({ valid: true, issues: [] });
    });

    it("reports a duplicate partner ID", () => {
        const partnerToDuplicate = caseStudy.partners.find(
            (partner) => partner.id === "MP-002",
        );

        if (!partnerToDuplicate) {
            throw new Error("Expected MP-002 in test fixture");
        }

        const caseStudyWithDuplicatePartner = {
            ...caseStudy,
            partners: [
                ...caseStudy.partners,
                { ...partnerToDuplicate },
            ],
        };

        expect(validateDatasetIntegrity(caseStudyWithDuplicatePartner)).toStrictEqual(
            {
                valid: false,
                issues: [
                    {
                        code: "DUPLICATE_PARTNER_ID",
                        partnerId: "MP-002",
                    },
                ],
            }
        );
    });

    it("reports a duplicate line item ID", () => {
        const lineItemToDuplicate = caseStudy.rfq.lineItems.find(
            (lineItem) => lineItem.id === "LI-002",
        );

        if (!lineItemToDuplicate) {
            throw new Error("Expected LI-002 in test fixture");
        }

        const caseStudyWithDuplicateLineItem = {
            ...caseStudy,
            rfq: {
                ...caseStudy.rfq,
                lineItems: [
                    ...caseStudy.rfq.lineItems,
                    { ...lineItemToDuplicate },
                ],
            },
        };

        expect(validateDatasetIntegrity(caseStudyWithDuplicateLineItem)).toStrictEqual(
            {
                valid: false,
                issues: [
                    {
                        code: "DUPLICATE_LINE_ITEM_ID",
                        lineItemId: "LI-002",
                    },
                ],
            }
        );
    });

    it("reports a duplicate bid ID", () => {
        const bidToDuplicate = caseStudy.bids.find(
            (bid) => bid.id === "BID-003",
        );

        if (!bidToDuplicate) {
            throw new Error("Expected BID-003 in test fixture");
        }

        const caseStudyWithDuplicateBid = {
            ...caseStudy,
            bids: [
                ...caseStudy.bids,
                { ...bidToDuplicate },
            ],
        };

        expect(validateDatasetIntegrity(caseStudyWithDuplicateBid)).toStrictEqual(
            {
                valid: false,
                issues: [
                    {
                        code: "DUPLICATE_BID_ID",
                        bidId: "BID-003",
                    },
                ],
            }
        );
    });

    it("reports a bid that references an unknown partner", () => {
        const bidToReplace = caseStudy.bids.find(
            (bid) => bid.id === "BID-001",
        );

        if (!bidToReplace) {
            throw new Error("Expected BID-001 in test fixture");
        }

        const caseStudyWithUnknownPartner = {
            ...caseStudy,
            bids: caseStudy.bids.map((bid) =>
                bid.id === bidToReplace.id
                    ? { ...bid, partnerId: "MP-999" }
                    : bid,
            ),
        };

        expect(validateDatasetIntegrity(caseStudyWithUnknownPartner)).toStrictEqual(
            {
                valid: false,
                issues: [
                    {
                        code: "UNKNOWN_PARTNER",
                        bidId: "BID-001",
                        partnerId: "MP-999",
                    },
                ],
            }
        );
    });

    it("reports a quote that references an unknown line item", () => {
        const bidToReplace = caseStudy.bids.find(
            (bid) => bid.id === "BID-001",
        );

        if (!bidToReplace) {
            throw new Error("Expected BID-001 in test fixture");
        }

        const quoteToReplace = bidToReplace.lineItemQuotes.find(
            (quote) => quote.lineItemId === "LI-001",
        );

        if (!quoteToReplace) {
            throw new Error("Expected LI-001 in test fixture");
        }

        const caseStudyWithUnknownLineItem = {
            ...caseStudy,
            bids: caseStudy.bids.map((bid) =>
                bid.id === bidToReplace.id
                    ? {
                        ...bid,
                        lineItemQuotes: bid.lineItemQuotes.map((quote) =>
                            quote.lineItemId === quoteToReplace.lineItemId
                                ? { ...quote, lineItemId: "LI-999" }
                                : quote,
                        ),
                    }
                    : bid,
            ),
        };

        expect(validateDatasetIntegrity(caseStudyWithUnknownLineItem)).toStrictEqual(
            {
                valid: false,
                issues: [
                    {
                        code: "UNKNOWN_LINE_ITEM",
                        bidId: "BID-001",
                        lineItemId: "LI-999",
                    },
                ],
            }
        );
    });

    it("reports a duplicate quote within one bid", () => {
        const bidToReplace = caseStudy.bids.find(
            (bid) => bid.id === "BID-003",
        );

        if (!bidToReplace) {
            throw new Error("Expected BID-003 in test fixture");
        }

        const quoteToDuplicate = bidToReplace.lineItemQuotes.find(
            (quote) => quote.lineItemId === "LI-002",
        );

        if (!quoteToDuplicate) {
            throw new Error("Expected LI-002 in test fixture");
        }

        const caseStudyWithDuplicateQuote = {
            ...caseStudy,
            bids: caseStudy.bids.map((bid) =>
                bid.id === bidToReplace.id
                    ? {
                        ...bid,
                        lineItemQuotes: [
                            ...bid.lineItemQuotes,
                            { ...quoteToDuplicate },
                        ],
                    }
                    : bid,
            ),
        };

        expect(validateDatasetIntegrity(caseStudyWithDuplicateQuote)).toStrictEqual(
            {
                valid: false,
                issues: [
                    {
                        code: "DUPLICATE_QUOTE",
                        bidId: "BID-003",
                        lineItemId: "LI-002",
                    },
                ],
            }
        );
    });

    it("reports a bid currency that differs from the base currency", () => {
        const bidToReplace = caseStudy.bids.find(
            (bid) => bid.id === "BID-002",
        );

        if (!bidToReplace) {
            throw new Error("Expected BID-002 in test fixture");
        }

        const caseStudyWithCurrencyMismatch = {
            ...caseStudy,
            bids: caseStudy.bids.map((bid) =>
                bid.id === bidToReplace.id
                    ? { ...bid, currency: "USD" }
                    : bid,
            ),
        };

        expect(validateDatasetIntegrity(caseStudyWithCurrencyMismatch)).toStrictEqual(
            {
                valid: false,
                issues: [
                    {
                        code: "CURRENCY_MISMATCH",
                        bidId: "BID-002",
                        currency: "USD",
                        baseCurrency: "EUR",
                    },
                ],
            }
        );
    });
});
