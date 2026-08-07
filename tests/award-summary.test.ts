import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
    buildAwardPlan,
    type AwardPlanResult,
} from "@/domain/award-plan";
import { loadCaseStudy } from "@/data/load-case-study";
import {
    AwardSummary,
} from "@/features/award-planner/award-summary";
import { formatMoney } from "@/lib/formatters";

const loadResult = loadCaseStudy();

if (!loadResult.success) {
    throw new Error(
        "Test fixture could not be loaded",
    );
}

const caseStudy = loadResult.data;

function renderAwardSummary(
    result: AwardPlanResult | null,
): string {
    return renderToStaticMarkup(
        createElement(AwardSummary, {
            result,
        }),
    );
}

describe("AwardSummary", () => {
    it("renders nothing before draft hydration completes", () => {
        expect(renderAwardSummary(null)).toBe("");
    });

    it("explains why an empty draft cannot produce a plan", () => {
        const result = buildAwardPlan(
            caseStudy,
            {},
        );

        const markup = renderAwardSummary(result);

        expect(markup).toContain(
            "4 line items still need",
        );
        expect(markup).toContain(
            'aria-labelledby="award-summary-heading"',
        );
        expect(markup).toContain(
            'id="award-summary-heading"',
        );
        expect(markup).not.toContain(
            "The award plan is complete.",
        );
    });

    it("renders current costs for an incomplete draft", () => {
        const result = buildAwardPlan(
            caseStudy,
            {
                "LI-001": "BID-002",
                "LI-002": "BID-002",
            },
        );

        const markup = renderAwardSummary(result);

        expect(markup).toContain(
            "Draft cost preview",
        );
        expect(markup).toContain(
            "Final award plan is not available yet.",
        );
        expect(markup).toContain(
            "Bosphorus Precision Ltd.",
        );
        expect(markup).toContain(
            "Current draft total",
        );
        expect(markup).toContain(
            formatMoney(8688.48, "EUR"),
        );
        expect(markup).toContain(
            formatMoney(39.744, "EUR", 3),
        );

        const shippingLabels =
            markup.match(/Shipping once per bid/g) ?? [];

        expect(shippingLabels).toHaveLength(1);

        expect(markup).not.toContain(
            "The award plan is complete.",
        );
    });

    it("renders a split award with shipping once per selected bid", () => {
        const result = buildAwardPlan(
            caseStudy,
            {
                "LI-001": "BID-002",
                "LI-002": "BID-002",
                "LI-003": "BID-003",
                "LI-004": "BID-003",
            },
        );

        const markup = renderAwardSummary(result);

        expect(markup).toContain(
            "The award plan is complete.",
        );
        expect(markup).toContain(
            "Bosphorus Precision Ltd.",
        );
        expect(markup).toContain(
            "Vistula Manufacturing Sp. z o.o.",
        );
        expect(markup).toContain(
            formatMoney(12978.48, "EUR"),
        );

        const shippingLabels =
            markup.match(/Shipping once per bid/g) ?? [];

        expect(shippingLabels).toHaveLength(2);
    });
});
