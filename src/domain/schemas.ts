import { z } from "zod";

export const caseStudyMetadataSchema = z.strictObject({
    evaluationTimestamp: z.iso.datetime(),
    baseCurrency: z.literal("EUR"),
});

export const rfqLineItemSchema = z.strictObject({
    id: z.string().min(1),
    partNumber: z.string().min(1),
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    requiredLeadTimeDays: z.number().int().positive(),
    manufacturingProcess: z.string().min(1),
    material: z.string().min(1),
    drawingFileName: z.string().min(1),
});

export const rfqSchema = z.strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    customerReference: z.string().min(1),
    lineItems: rfqLineItemSchema.array().min(1),
});

export const partnerSchema = z.strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    country: z.string().length(2),
    qualityRating: z.number().min(0).max(5),
    onTimeDeliveryRate: z.number().min(0).max(1),
});

export const lineItemQuoteSchema = z.strictObject({
    lineItemId: z.string().min(1),
    unitPrice: z.number(),
    setupFee: z.number(),
    minimumOrderQuantity: z.number().int().positive(),
    leadTimeDays: z.number().int().min(0),
    notes: z.string().nullable(),
});

export const bidSchema = z.strictObject({
    id: z.string().min(1),
    partnerId: z.string().min(1),
    status: z.enum(["SUBMITTED", "WITHDRAWN"]),
    currency: z.string().length(3),
    submittedAt: z.iso.datetime(),
    validUntil: z.iso.datetime(),
    shippingFee: z.number().min(0),
    notes: z.string().nullable(),
    lineItemQuotes: lineItemQuoteSchema.array(),
});

export const caseStudySchema = z.strictObject({
    metadata: caseStudyMetadataSchema,
    rfq: rfqSchema,
    partners: partnerSchema.array(),
    bids: bidSchema.array(),
});

export type CaseStudyMetadata = z.infer<
    typeof caseStudyMetadataSchema
>;

export type RfqLineItem = z.infer<
    typeof rfqLineItemSchema
>;

export type Rfq = z.infer<
    typeof rfqSchema
>;

export type Partner = z.infer<
    typeof partnerSchema
>;

export type LineItemQuote = z.infer<
    typeof lineItemQuoteSchema
>;

export type Bid = z.infer<
    typeof bidSchema
>;

export type CaseStudy = z.infer<
    typeof caseStudySchema
>;