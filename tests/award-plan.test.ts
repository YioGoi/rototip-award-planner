import { describe, expect, it } from "vitest";
import { loadCaseStudy } from "@/data/load-case-study";
import { buildAwardPlan } from "@/domain/award-plan";


const loadResult = loadCaseStudy();

if (!loadResult.success) {
    throw new Error("Test fixture could not be loaded");
}

const caseStudy = loadResult.data;

describe("buildAwardPlan", () => {
    it("returns an incomplete result for an empty draft", () => {
        const result = buildAwardPlan(caseStudy, {});

        expect(result).toStrictEqual(
            {
                complete: false,
                preview: {
                    currency: "EUR",
                    partners: [],
                    currentTotal: 0,
                },
                missingLineItemIds: caseStudy.rfq.lineItems.map(
                    (lineItem) => lineItem.id,
                ),
                invalidSelections: [],
            }
        );
    });

    it("returns an incomplete result for an ineligible selection", () => {
        const ineligibleSelections = {
            "LI-003": "BID-002",
        };

        const result = buildAwardPlan(caseStudy, ineligibleSelections);

        expect(result).toStrictEqual(
            {
                complete: false,
                preview: {
                    currency: "EUR",
                    partners: [],
                    currentTotal: 0,
                },
                missingLineItemIds: caseStudy.rfq.lineItems
                    .filter((lineItem) => lineItem.id !== "LI-003")
                    .map((lineItem) => lineItem.id),
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
            }
        );
    });

    it("builds a cost preview for valid selections in an incomplete draft", () => {
        const result = buildAwardPlan(caseStudy, {
            "LI-001": "BID-002",
            "LI-002": "BID-002",
        });

        expect(result).toMatchObject({
            complete: false,
            preview: {
                currency: "EUR",
                currentTotal: 8688.48,
                partners: [
                    {
                        partnerId: "MP-002",
                        lineItemsSubtotal: 8127.28,
                        shippingTotal: 561.2,
                        partnerTotal: 8688.48,
                        bids: [
                            {
                                bidId: "BID-002",
                                lineItemsSubtotal: 8127.28,
                                shippingFee: 561.2,
                                bidTotal: 8688.48,
                                lineItems: [
                                    {
                                        lineItemId: "LI-001",
                                        lineTotal: 5229.28,
                                    },
                                    {
                                        lineItemId: "LI-002",
                                        lineTotal: 2898,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            missingLineItemIds: [
                "LI-003",
                "LI-004",
            ],
            invalidSelections: [],
        });
    });

    it("builds a complete plan and charges shipping once for one selected bid", () => {
        const selections = {
            "LI-001": "BID-001",
            "LI-002": "BID-001",
            "LI-003": "BID-001",
            "LI-004": "BID-001",
        };

        const result = buildAwardPlan(caseStudy, selections);

        expect(result).toStrictEqual(
            {
                complete: true,
                plan: {
                    rfqId: "RFQ-2026-1042",
                    evaluationTimestamp: "2026-08-03T09:00:00Z",
                    currency: "EUR",
                    partners: [
                        {
                            partnerId: "MP-001",
                            partnerName: "Atlas CNC GmbH",
                            country: "DE",
                            bids: [
                                {
                                    bidId: "BID-001",
                                    lineItems: [
                                        {
                                            lineItemId: "LI-001",
                                            partNumber: "NOVA-HSG-042",
                                            quantity: 120,
                                            unitPrice: 46.8,
                                            setupFee: 350,
                                            leadTimeDays: 18,
                                            lineTotal: 5966,
                                        },
                                        {
                                            lineItemId: "LI-002",
                                            partNumber: "NOVA-SFT-018",
                                            quantity: 80,
                                            unitPrice: 38.5,
                                            setupFee: 220,
                                            leadTimeDays: 24,
                                            lineTotal: 3300,
                                        },
                                        {
                                            lineItemId: "LI-003",
                                            partNumber: "NOVA-BRK-007",
                                            quantity: 250,
                                            unitPrice: 12.4,
                                            setupFee: 180,
                                            leadTimeDays: 15,
                                            lineTotal: 3280,
                                        },
                                        {
                                            lineItemId: "LI-004",
                                            partNumber: "NOVA-SPC-003",
                                            quantity: 40,
                                            unitPrice: 22,
                                            setupFee: 90,
                                            leadTimeDays: 12,
                                            lineTotal: 970,
                                        },
                                    ],
                                    lineItemsSubtotal: 13516,
                                    shippingFee: 420,
                                    bidTotal: 13936,
                                },
                            ],
                            lineItemsSubtotal: 13516,
                            shippingTotal: 420,
                            partnerTotal: 13936,
                        },
                    ],
                    grandTotal: 13936,
                },
            }
        );
    });

    it("supports a split award and charges shipping once per selected bid", () => {
        const selections = {
            "LI-001": "BID-002",
            "LI-002": "BID-002",
            "LI-003": "BID-003",
            "LI-004": "BID-003",
        };

        const result = buildAwardPlan(caseStudy, selections);

        expect(result.complete).toBe(true);

        if (!result.complete) {
            throw new Error("Expected a complete award plan");
        }

        const bosphorus = result.plan.partners.find(
            (group) => group.partnerId === "MP-002",
        );
        if (!bosphorus) {
            throw new Error("Expected to find partner MP-002 in the award plan");
        }

        const vistula = result.plan.partners.find(
            (group) => group.partnerId === "MP-003",
        );
        if (!vistula) {
            throw new Error("Expected to find partner MP-003 in the award plan");
        }

        expect(bosphorus).toMatchObject({
            lineItemsSubtotal: 8127.28,
            shippingTotal: 561.2,
            partnerTotal: 8688.48,
            bids: [
                {
                    bidId: "BID-002",
                    shippingFee: 561.2,
                    bidTotal: 8688.48,
                    lineItems: [
                        {
                            lineItemId: "LI-001",
                        },
                        {
                            lineItemId: "LI-002",
                        },
                    ],
                }
            ]
        });

        expect(vistula).toMatchObject({
            lineItemsSubtotal: 3990,
            shippingTotal: 300,
            partnerTotal: 4290,
            bids: [
                {
                    bidId: "BID-003",
                    shippingFee: 300,
                    bidTotal: 4290,
                    lineItems: [
                        {
                            lineItemId: "LI-003",
                        },
                        {
                            lineItemId: "LI-004",
                        },
                    ],
                }
            ]
        });

        expect(result.plan.partners).toHaveLength(2);
        expect(result.plan.grandTotal).toBe(12978.48);
    });
});
