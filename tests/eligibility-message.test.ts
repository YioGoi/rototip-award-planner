import { describe, expect, it } from "vitest";

import type {
    EligibilityIssue,
} from "@/domain/eligibility";
import {
    getEligibilityIssueMessage,
} from "@/features/award-planner/eligibility-message";

type MessageCase = {
    issue: EligibilityIssue;
    expectedMessage: string;
};

const messageCases: MessageCase[] = [
    {
        issue: {
            code: "BID_NOT_SUBMITTED",
            status: "WITHDRAWN",
        },
        expectedMessage: "Bid status is withdrawn.",
    },
    {
        issue: {
            code: "BID_EXPIRED",
            evaluationTimestamp:
                "2026-08-03T09:00:00Z",
            validUntil: "2026-08-03T09:00:00Z",
        },
        expectedMessage:
            "Bid expired at 3 Aug 2026, 09:00 UTC.",
    },
    {
        issue: {
            code: "MISSING_QUOTE",
            bidId: "BID-005",
            lineItemId: "LI-004",
        },
        expectedMessage:
            "No quote was submitted for this line item.",
    },
    {
        issue: {
            code: "INVALID_UNIT_PRICE",
            unitPrice: 0,
        },
        expectedMessage:
            "Unit price must be greater than zero; received 0.",
    },
    {
        issue: {
            code: "INVALID_SETUP_FEE",
            setupFee: -10,
        },
        expectedMessage:
            "Setup fee cannot be negative; received -10.",
    },
    {
        issue: {
            code: "MOQ_EXCEEDS_QUANTITY",
            minimumOrderQuantity: 75,
            quantity: 40,
        },
        expectedMessage:
            "Minimum order quantity (75) exceeds the requested quantity (40).",
    },
    {
        issue: {
            code: "LEAD_TIME_EXCEEDS_REQUIREMENT",
            leadTimeDays: 24,
            requiredLeadTimeDays: 18,
        },
        expectedMessage:
            "Lead time (24 days) exceeds the requirement (18 days).",
    },
];

describe("getEligibilityIssueMessage", () => {
    it.each(messageCases)(
        "formats $issue.code",
        ({ issue, expectedMessage }) => {
            expect(
                getEligibilityIssueMessage(issue),
            ).toBe(expectedMessage);
        },
    );
});
