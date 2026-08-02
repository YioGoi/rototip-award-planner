import { describe, expect, it } from "vitest";

import caseStudyData from "../data/case-study.json";
import { validateCaseStudy } from "../src/data/load-case-study";
import {
  caseStudySchema,
  lineItemQuoteSchema,
} from "../src/domain/schemas";

describe("caseStudySchema", () => {
  it("accepts the supplied case study", () => {
    expect(caseStudySchema.safeParse(caseStudyData).success).toBe(true);
  });

  it("rejects an invalid nested currency shape", () => {
    const invalidData = {
      ...caseStudyData,
      bids: [{ ...caseStudyData.bids[0], currency: "EU" }],
    };

    expect(caseStudySchema.safeParse(invalidData).success).toBe(false);
  });
});

describe("lineItemQuoteSchema", () => {
  it("leaves monetary eligibility decisions to the domain layer", () => {
    const quote = {
      ...caseStudyData.bids[0].lineItemQuotes[0],
      unitPrice: 0,
      setupFee: -1,
    };

    expect(lineItemQuoteSchema.safeParse(quote).success).toBe(true);
  });
});

describe("validateCaseStudy", () => {
  it("runs relational integrity checks after schema validation", () => {
    const dataWithUnknownPartner = {
      ...caseStudyData,
      bids: [
        {
          ...caseStudyData.bids[0],
          partnerId: "MP-999",
        },
        ...caseStudyData.bids.slice(1),
      ],
    };

    const result = validateCaseStudy(dataWithUnknownPartner);

    expect(result).toMatchObject({
      success: false,
      stage: "integrity",
      issues: [
        {
          code: "UNKNOWN_PARTNER",
          bidId: "BID-001",
          partnerId: "MP-999",
        },
      ],
    });
  });
});
