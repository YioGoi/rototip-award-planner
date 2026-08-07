# Rototip Award Planner — As-Built Implementation Plan

## Status

The MVP is implemented and verified. The application covers the supplied RFQ comparison, eligibility, selection, draft persistence, partial cost preview, and complete award-plan flows.

This document describes the system as it exists now. [`SOLUTION.md`](SOLUTION.md) provides the shorter walkthrough version.

## 1. Objective

Provide a dependable decision-making interface in which an operations user can:

1. Review every RFQ line item and every manufacturing-partner bid.
2. Compare price, lead time, partner reliability, notes, and bid validity.
3. Select at most one eligible quote for each line item.
4. Split an award across bids and partners.
5. Save and restore an incomplete draft in the browser.
6. See the current commercial impact of valid draft selections.
7. Produce a final award plan only after every line item has a valid selection.

## 2. Implemented scope

### Core workflow

- The RFQ header displays the title, identifiers, and fixed evaluation timestamp.
- Every RFQ line item is rendered with its technical and quantity requirements.
- Every bid remains visible for every line item, including missing and ineligible quotes.
- Eligible quote choices use radio-group semantics to enforce one selection per line item.
- Each line item's choices use native `fieldset`/`legend` grouping, and radios reference their eligibility descriptions.
- Ineligibility reasons are displayed and ineligible choices are disabled.
- Selections may be split across multiple partners.

### Draft behavior

- Empty, partial, complete, and invalid-restored drafts are supported.
- Only user selections are persisted in `localStorage`.
- Draft data is versioned, RFQ-scoped, parsed with Zod, and revalidated against current business rules.
- Hydration is deferred until after the client mounts to avoid a misleading empty-state flash.
- Users can clear one selection or reset the entire draft.

### Cost output

- A partial draft shows a clearly labelled cost preview built only from current valid selections.
- The preview groups selected work by partner and bid.
- It shows line totals, bid subtotals, shipping once per selected bid, partner totals, and the current draft total.
- A preview is not presented as a final award plan.
- The final award summary is produced only when every RFQ line item has one eligible selection.

## 3. Actual architecture

```text
data/case-study.json
        |
        v
Zod schema validation
        |
        v
Cross-record integrity validation
        |
        v
Next.js Server Component (page.tsx)
        |
        v
Validated serializable CaseStudy
        |
        v
AwardPlanner Client Component
        |
        +--> per-RFQ Zustand store
        |       +--> versioned localStorage draft
        |       +--> deferred hydration
        |
        +--> pure domain functions
        |       +--> eligibility
        |       +--> selection revalidation
        |       +--> Decimal.js calculations
        |       +--> preview/final aggregation
        |
        v
Comparison UI + draft status + cost summary
```

### Boundary decisions

- JSON loading and validation happen on the server.
- Only validated data crosses the Server-to-Client Component boundary.
- UI components format and present domain output; they do not recalculate commercial rules.
- Persisted state contains decisions, not derived totals or eligibility results.

## 4. Domain model

```text
RFQ
└── many line items

Partner
└── many bids (the supplied dataset currently has one bid per partner)

Bid
├── belongs to one partner
├── status, validity, currency, shipping, and notes
└── many line-item quotes

Line-item quote
└── commercial response for one RFQ line item within one bid

Draft selection
└── lineItemId -> bidId
```

The selection key is sufficient because the dataset allows at most one quote for the same line item within a bid. Dataset integrity validation enforces that invariant.

## 5. Implemented business rules

### Time and bid eligibility

- `metadata.evaluationTimestamp` is always used as the current time.
- `validUntil` is an exclusive boundary.
- A bid is eligible only when it is `SUBMITTED` and not expired.
- Withdrawn and expired bids stay visible but cannot be selected.

### Quote eligibility

A quote is eligible only when:

```text
parent bid is eligible
AND unitPrice > 0
AND setupFee >= 0
AND minimumOrderQuantity <= RFQ quantity
AND leadTimeDays <= required lead time
```

A missing quote remains visible as an unavailable choice.

### Money

```text
line total = unit price * RFQ quantity + setup fee
```

- Intermediate calculations use `Decimal.js` without intermediate rounding.
- Calculated totals use two decimal places and `ROUND_HALF_UP`; supplied unit prices display up to three decimal places.
- Shipping belongs to a bid and is charged once when one or more quotes from that bid are selected.
- Selecting multiple line items from the same bid does not duplicate shipping.

### Completion

- A draft may contain zero, some, or all selections.
- Invalid stored selections remain visible but are excluded from preview and final totals.
- A complete plan requires one currently eligible selection for every RFQ line item.

## 6. Data validation

Zod validates JSON shape and primitive constraints. A separate integrity layer validates relationships that schema validation alone cannot establish:

- Unique partner, bid, and RFQ line-item IDs.
- Every bid references an existing partner.
- Every quote references an existing RFQ line item.
- A bid does not quote the same line item more than once.
- Bid currency matches the exercise base currency.

Invalid data produces a visible dataset-error page instead of entering the interactive planner.

## 7. State and persistence

The canonical state is intentionally small:

```ts
type DraftSelections = Record<string, string>;
```

The persisted envelope is:

```ts
type PersistedDraft = {
    version: 1;
    rfqId: string;
    selections: DraftSelections;
};
```

Storage key:

```text
rototip-award-draft:<rfqId>:v1
```

On restore, the application validates the envelope and re-evaluates every selection. Totals, partner data, and eligibility are always derived again.

## 8. Preview and final-plan calculation

`buildAwardPlan` first validates the draft and aggregates all currently valid selections through one shared partner/bid calculation path.

```text
Valid selections
    |
    v
Selected rows with Decimal line totals
    |
    v
Partner buckets
    |
    v
Bid buckets (shipping added once here)
    |
    +--> incomplete: AwardPlanPreview
    |
    └--> complete: AwardPlan
```

The preview and final result therefore cannot drift into different shipping or subtotal implementations.

## 9. Actual project structure

```text
data/
  case-study.json

src/
  app/
    globals.css
    layout.tsx
    page.tsx

  data/
    load-case-study.ts

  domain/
    award-plan.ts
    dataset-integrity.ts
    eligibility.ts
    money.ts
    schemas.ts
    selections.ts

  features/award-planner/
    award-planner.tsx
    award-summary.tsx
    draft-status.tsx
    eligibility-message.tsx
    line-item-section.tsx
    quote-option.tsx

  lib/
    formatters.ts

  store/
    award-draft-store.ts
    persisted-draft-schema.ts

tests/
  award-draft-store.test.ts
  award-plan.test.ts
  award-summary.test.ts
  dataset-integrity.test.ts
  eligibility-message.test.ts
  eligibility.test.ts
  money.test.ts
  persisted-draft-schema.test.ts
  schemas.test.ts
  selections.test.ts
```

## 10. Technology decisions

- **Next.js App Router:** provides a simple server/client boundary and matches the suggested stack.
- **Strict TypeScript:** makes domain result states and refactoring explicit.
- **React:** implements the interactive comparison and selection interface.
- **Tailwind CSS:** provides a compact, consistent UI without a separate component library.
- **Zod:** validates the supplied JSON and untrusted browser persistence.
- **Zustand:** manages the small shared draft state with per-RFQ persistence.
- **Decimal.js:** avoids binary floating-point errors in commercial calculations.
- **Vitest:** tests pure domain rules, store behavior, and important rendered states quickly.

## 11. Verification

Current automated coverage consists of 10 test files and 61 tests covering:

- Dataset schema and relationship integrity.
- Exclusive expiry and withdrawn bid behavior.
- Missing, invalid-price, invalid-setup, MOQ, and lead-time cases.
- Deterministic monetary calculation and rounding.
- Empty, partial, invalid, and complete selection validation.
- Shipping once per selected bid and split awards.
- Draft serialization, corrupt storage, RFQ isolation, hydration, and reset behavior.
- Empty, partial-preview, and complete award-summary rendering.

Quality commands:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## 12. Intentional trade-offs and non-goals

- Local JSON is used because the exercise explicitly requires no external service.
- `localStorage` is sufficient for one-browser draft persistence; there is no backend synchronization.
- No authentication, database, API, audit log, or multi-user conflict handling is included.
- Only EUR is supported because the supplied dataset and brief are single-currency.
- No automatic cheapest/best recommendation is made because quality, delivery, and notes are human decision inputs.
- No downloadable JSON was added because the in-interface award summary satisfies the output requirement.
- No browser E2E framework was added; business-critical behavior is covered by domain, store, and rendered-component tests plus manual smoke testing.

## 13. Completed delivery checklist

- [x] All RFQ line items and partner choices remain visible.
- [x] Eligibility reasons are correct and understandable.
- [x] Only eligible quotes can be selected.
- [x] One selection per line item is enforced.
- [x] Split awards work.
- [x] Partial selections show a valid-only cost preview.
- [x] Totals are correct and shipping is charged once per selected bid.
- [x] Partial drafts survive refresh.
- [x] Invalid restored selections are visible and excluded from totals.
- [x] Final award output requires a complete valid selection set.
- [x] Tests, lint, typecheck, and production build pass.

## 14. Interview demo flow

1. Explain RFQ -> line items -> bids -> quotes -> award plan.
2. Compare one eligible and one ineligible quote.
3. Select one quote and show the partial cost preview.
4. Select a second quote from the same bid and show that shipping remains unchanged.
5. Refresh and demonstrate restored draft selections.
6. Split the remaining award across another partner.
7. Complete the plan and show the final partner/bid grouping.
8. Open the pure domain functions and focused tests.
9. Explain the documented technology choices and trade-offs.
