import { describe, expect, it } from "vitest";
import { loadCaseStudy } from "@/data/load-case-study";
import { validateDraftSelections } from "@/domain/selections";

const loadResult = loadCaseStudy();

if (!loadResult.success) {
    throw new Error("Test fixture could not be loaded");
}

const caseStudy = loadResult.data;

describe("validateDraftSelections", () => {
    it("reports every RFQ line item as missing for an empty draft", () => {
        const result = validateDraftSelections(caseStudy, {});

        expect(result).toStrictEqual({
            validSelections: {},
            missingLineItemIds: caseStudy.rfq.lineItems.map((li) => li.id),
            invalidSelections: [],
        });
    });

    it("keeps an eligible partial selection and reports the remaining line items", () => {
        const partialSelections = {
            "LI-001": "BID-001",
        };

        const result = validateDraftSelections(caseStudy, partialSelections);

        expect(result).toStrictEqual({
            validSelections: partialSelections,
            missingLineItemIds: caseStudy.rfq.lineItems
                .filter((li) => li.id !== "LI-001")
                .map((li) => li.id),
            invalidSelections: [],
        });
    });

    it("reports a selection for a line item that no longer exists", () => {
        const selectionsWithInvalidLineItem = {
            "LI-999": "BID-001",
        };

        const result = validateDraftSelections(caseStudy, selectionsWithInvalidLineItem);

        expect(result).toStrictEqual({
            validSelections: {},
            missingLineItemIds: caseStudy.rfq.lineItems.map((li) => li.id),
            invalidSelections: [
                {
                    code: "SELECTION_LINE_ITEM_NOT_FOUND",
                    lineItemId: "LI-999",
                    bidId: "BID-001",
                },
            ],
        });
    });

    it("reports a selection for a bid that no longer exists", () => {
        const selectionsWithInvalidBid = {
            "LI-001": "BID-999",
        };

        const result = validateDraftSelections(caseStudy, selectionsWithInvalidBid);

        expect(result).toStrictEqual({
            validSelections: {},
            missingLineItemIds: caseStudy.rfq.lineItems
                .filter((li) => li.id !== "LI-001")
                .map((li) => li.id),
            invalidSelections: [
                {
                    code: "SELECTION_BID_NOT_FOUND",
                    lineItemId: "LI-001",
                    bidId: "BID-999",
                },
            ],
        });
    });

    it("reports a restored selection whose quote is ineligible", () => {
        const selectionsWithIneligibleQuote = {
            "LI-003": "BID-002",
        };

        const result = validateDraftSelections(caseStudy, selectionsWithIneligibleQuote);

        expect(result).toStrictEqual({
            validSelections: {},
            missingLineItemIds: caseStudy.rfq.lineItems
                .filter((li) => li.id !== "LI-003")
                .map((li) => li.id),
            invalidSelections: [
                {
                    code: "SELECTION_QUOTE_INELIGIBLE",
                    lineItemId: "LI-003",
                    bidId: "BID-002",
                    issues: [
                        {
                            code: "LEAD_TIME_EXCEEDS_REQUIREMENT",
                            leadTimeDays: 24,
                            requiredLeadTimeDays: 18,
                        },
                    ],
                },
            ],
        });
    });
});