# Rototip Bid Comparison and Award Plan — Implementation Plan

## 1. Objective

Build a focused web application that helps a Rototip operations user:

1. Review an RFQ and all partner bids.
2. Compare eligible and ineligible line-item quotes.
3. Select at most one eligible quote for each RFQ line item.
4. Split the award across multiple partners when useful.
5. Persist an incomplete draft in the browser.
6. Produce a complete award-plan summary only when every line item has a valid selection.

The implementation should prioritize dependable business rules, clear decision support, and explainable engineering choices over infrastructure or visual overengineering.

---

## 2. Domain glossary

- **RFQ — Request for Quotation:** A customer's request for prices and delivery terms for one or more manufactured parts.
- **Line item:** One requested part, quantity, and delivery requirement within the RFQ.
- **Manufacturing partner:** A supplier capable of manufacturing one or more RFQ line items.
- **Bid:** A partner's overall response to the RFQ. It contains bid-level status, validity, shipping, notes, and line-item quotes.
- **Quote:** A partner's price and delivery terms for one specific RFQ line item.
- **Eligible:** Allowed to be selected under the supplied business rules.
- **Award:** Assigning a line item to a selected partner quote.
- **Split award:** Assigning different line items from the same RFQ to different partners.
- **Award plan:** The complete proposed allocation of line items to partners, including line totals, shipping fees, partner totals, and the grand total.
- **Draft:** A partial or complete set of user selections that has not yet become a valid final award plan.

---

## 3. Scope

### MVP

- Render the RFQ summary and every RFQ line item.
- Show every partner choice, including missing and ineligible quotes.
- Explain all ineligibility reasons.
- Allow one eligible selection per line item.
- Allow selections from multiple partners.
- Calculate line-item totals.
- Charge each selected bid's shipping fee once.
- Show partner subtotals and the complete total in EUR.
- Persist partial selections in browser storage.
- Restore the draft after refresh.
- Detect and visibly report invalid restored selections.
- Produce a complete award-plan summary only when all line items have eligible selections.
- Provide focused tests for the business-rule layer.

### Optional only after MVP

- Copy or download the award plan as JSON.
- Responsive or keyboard-focused refinements.
- A live deployment.
- Dockerization.

---

## 4. Intentional non-goals

- No backend or mock API.
- No database, Prisma, or authentication.
- No external service calls.
- No TanStack Query because there is no remote server state.
- No Redux Toolkit because the shared state is small and focused.
- No automatic "best bid" recommendation.
- No multi-currency conversion.
- No premature memoization or unnecessary abstraction.
- No pixel-perfect design effort beyond a clear and dependable comparison interface.

---

## 5. Technology choices

### Next.js App Router

Used because it matches Rototip's stack and provides a clear server/client boundary.

- The supplied JSON is loaded and validated on the server.
- The interactive award planner is a Client Component.
- Domain functions remain framework-independent.

### TypeScript in strict mode

Used for explicit domain models, safe refactoring, and exhaustiveness across eligibility and award-plan result types.

### Tailwind CSS

Used to build a consistent comparison interface efficiently within the exercise timebox.

### Zod

Used for runtime validation at untrusted boundaries:

- The supplied `case-study.json`.
- Persisted browser draft data.

### Zustand with persist middleware

Used for the small amount of shared interactive state:

- `lineItemId -> bidId` selections.
- Draft reset and hydration status.

Only user decisions are persisted. Eligibility, totals, and award-plan output are always derived again.

### localStorage

Used because browser storage explicitly satisfies the persistence requirement. This is an intentional scope-aligned choice, not a fallback.

### decimal.js

Used for deterministic base-10 monetary arithmetic because the dataset contains fractional unit prices such as `39.744`.

- Intermediate values remain unrounded.
- Output values are rounded to two decimal places.
- Rounding policy: `ROUND_HALF_UP`.

### Vitest

Used to verify pure business rules independently of the React interface.

---

## 6. High-level architecture

```text
data/case-study.json
        |
        v
Zod dataset validation
        |
        v
Next.js Server Component
        |
        v
Validated serializable data
        |
        v
AwardPlanner Client Component
        |
        +--> Zustand selections + localStorage persistence
        |
        +--> Pure domain functions
                - dataset integrity
                - bid eligibility
                - quote eligibility
                - monetary calculations
                - restored-selection validation
                - award-plan generation
        |
        v
Comparison UI + draft state + award summary
```

### Core principle

> Persist user decisions; derive business results.

Do not persist totals, eligibility, partner details, or generated award-plan output.

---

## 7. Proposed folder structure

```text
data/
  case-study.json

src/
  app/
    layout.tsx
    page.tsx

  data/
    load-case-study.ts

  domain/
    schemas.ts
    types.ts
    dataset-integrity.ts
    eligibility.ts
    money.ts
    selections.ts
    award-plan.ts

  features/
    award-planner/
      award-planner.tsx
      rfq-header.tsx
      line-item-section.tsx
      quote-option.tsx
      award-summary.tsx
      draft-status.tsx
      eligibility-message.tsx

  store/
    award-draft-store.ts
    persisted-draft-schema.ts

  lib/
    formatters.ts

tests/
  dataset-integrity.test.ts
  eligibility.test.ts
  money.test.ts
  award-plan.test.ts
```

The structure may be simplified if a file remains too small to justify its own module.

---

## 8. Data and state model

### Canonical draft state

A line-item quote has no independent ID in the supplied dataset. It is identified by:

```text
bidId + lineItemId
```

The minimal state is therefore:

```ts
type DraftSelections = Record<LineItemId, BidId>;
```

Example:

```ts
{
  "LI-001": "BID-002",
  "LI-002": "BID-001",
  "LI-003": "BID-003"
}
```

### Persisted draft envelope

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

### Persistence rules

- Persist only `selections`.
- Validate persisted data with Zod.
- Ignore corrupted persisted data safely.
- Re-evaluate every restored selection against the current dataset.
- Do not silently include an invalid restored selection in a complete award plan.
- Keep invalid restored selections visible until the user replaces or removes them.
- Show hydration/restoration state before rendering selection-dependent totals.
- Make auto-save behavior visible: `Draft saved in this browser`.
- Provide `Reset draft`.

---

## 9. Business rules

### 9.1 Time

Always use:

```ts
metadata.evaluationTimestamp
```

Never use the real clock.

`validUntil` is an exclusive cutoff:

```ts
evaluationTimestamp >= validUntil
```

means the bid is expired.

### 9.2 Bid eligibility

A bid is eligible only when:

```text
status === "SUBMITTED"
AND
evaluationTimestamp < validUntil
```

Keep ineligible bids visible and explain why they cannot be selected.

### 9.3 Quote eligibility

A line-item quote is eligible only when:

```text
parent bid is eligible
AND unitPrice > 0
AND setupFee >= 0
AND minimumOrderQuantity <= RFQ quantity
AND leadTimeDays <= requiredLeadTimeDays
```

A missing quote is ineligible and must remain understandable in the comparison UI.

### 9.4 Selection invariant

- A line item may have zero or one selected quote.
- A selection is valid only if its current quote is eligible.
- The UI should use radio-group semantics per line item.

### 9.5 Monetary rules

Line-item total:

```text
unitPrice * RFQ quantity + setupFee
```

Shipping:

```text
Charge a selected bid's shippingFee exactly once
when one or more quotes from that bid are selected.
```

Totals:

- Group by selected bid for shipping correctness.
- Present the final award plan grouped by partner.
- Round display and output values to two decimal places.
- Use decimal arithmetic for all intermediate calculations.

### 9.6 Complete award plan

A complete award plan requires:

```text
one selection for every RFQ line item
AND
every selected quote is currently eligible
```

If incomplete or invalid, return a structured result describing:

- Missing line-item IDs.
- Invalid selections and their reasons.

---

## 10. Domain result types

### Eligibility

```ts
type EligibilityIssueCode =
  | "BID_NOT_SUBMITTED"
  | "BID_EXPIRED"
  | "MISSING_QUOTE"
  | "INVALID_UNIT_PRICE"
  | "INVALID_SETUP_FEE"
  | "MOQ_EXCEEDS_QUANTITY"
  | "LEAD_TIME_EXCEEDS_REQUIREMENT";

type EligibilityResult =
  | { eligible: true; issues: [] }
  | { eligible: false; issues: EligibilityIssue[] };
```

Issues should carry structured values such as actual and required MOQ or lead time. The UI may then format them into user-facing messages without reimplementing business rules.

### Award-plan result

```ts
type AwardPlanResult =
  | {
      complete: false;
      missingLineItemIds: string[];
      invalidSelections: InvalidSelection[];
    }
  | {
      complete: true;
      plan: AwardPlan;
    };
```

---

## 11. Core domain functions

These functions should be pure and independently tested:

```ts
validateDatasetIntegrity(data): DatasetIntegrityResult

evaluateBidEligibility(
  bid,
  evaluationTimestamp,
): EligibilityResult

evaluateQuoteEligibility({
  bid,
  quote,
  lineItem,
  evaluationTimestamp,
}): EligibilityResult

calculateLineItemTotal({
  unitPrice,
  quantity,
  setupFee,
}): Decimal

validateDraftSelections(
  data,
  selections,
): ValidatedSelectionsResult

buildAwardPlan(
  data,
  selections,
): AwardPlanResult
```

React components must not duplicate these rules.

---

## 12. Dataset integrity checks

Zod validates shape and primitive constraints. A small integrity layer should additionally check:

- IDs are unique within their collections.
- Every bid references an existing partner.
- Every quote references an existing RFQ line item.
- A bid does not quote the same line item more than once.
- Bid currency matches the supplied base currency for this single-currency exercise.

Integrity failures should render a clear invalid-dataset state rather than crashing the UI.

---

## 13. Known case-study edge cases

The implementation and tests must explicitly cover:

1. **Exclusive expiry:** `BID-004` expires exactly at the evaluation timestamp and is therefore ineligible.
2. **Withdrawn bid:** `BID-005` is ineligible despite its future validity date.
3. **Lead-time failure:** `BID-002 / LI-003` exceeds the required lead time.
4. **MOQ failure:** `BID-002 / LI-004` requires more units than requested.
5. **Missing quote:** `BID-005` has no quote for `LI-004`.
6. **Shipping once:** Selecting multiple quotes from one bid charges one shipping fee.
7. **Split award:** Selections may come from multiple bids/partners.
8. **Invalid restored draft:** A stored selection may no longer be eligible and must block completion visibly.
9. **Incomplete draft:** Partial selection is valid to save but cannot produce a complete plan.
10. **Fractional pricing:** Monetary calculations contain three-decimal unit prices and must remain deterministic.

---

## 14. UI plan

### Page shell

- RFQ title and customer reference.
- Evaluation timestamp.
- Selection progress, for example `2 of 4 selected`.
- Draft persistence status.

### Line-item comparison section

For each RFQ line item, show:

- Part number and name.
- Manufacturing process and material.
- Requested quantity.
- Required lead time.
- Drawing filename.

For every partner choice, show:

- Partner name and country.
- Quality rating.
- On-time delivery rate.
- Bid status and validity.
- Unit price.
- Setup fee.
- Calculated line-item total.
- MOQ.
- Lead time.
- Partner/bid notes and quote notes.
- Eligibility status.
- All ineligibility reasons.

Ineligible and missing choices remain visible but disabled.

### Award summary

A sticky desktop sidebar or clear summary section should show:

- Selection progress.
- Invalid restored selections.
- Grouped selected line items per partner.
- Partner subtotal.
- One shipping fee per selected bid.
- Partner total.
- Grand total.
- Complete/incomplete state.
- Optional award-plan JSON action after completion.

### Recommendation policy

The interface may visually identify the lowest eligible line-item price, but it must not label it as the automatic best or recommended choice.

---

## 15. Testing strategy

Prioritize domain tests over broad snapshot tests.

### Dataset integrity

- Invalid partner reference.
- Invalid line-item reference.
- Duplicate quote for one line item within a bid.

### Eligibility

- `evaluationTimestamp === validUntil` is expired.
- Submitted and unexpired bid is eligible.
- Withdrawn bid is ineligible.
- Missing quote is ineligible.
- Non-positive unit price is ineligible.
- Negative setup fee is ineligible.
- MOQ above quantity is ineligible.
- Lead time above requirement is ineligible.

### Money

- Correct line-item total.
- Fractional unit price calculation.
- Shipping charged once for multiple line items from one bid.
- Shipping charged separately for different selected bids.
- Output rounded to two decimal places using the documented policy.

### Award plan

- Empty and partial drafts remain incomplete.
- Complete valid selections produce a plan.
- Plan groups work by partner and includes `bidId`.
- Invalid restored selection blocks completion.
- Every line item appears exactly once in a complete plan.

---

## 16. Four-hour implementation timebox

Track focused implementation time and avoid optional work before MVP completion.

### 0:00–0:25 — Setup and data boundary

- Initialize Next.js with strict TypeScript and Tailwind.
- Add Zod, Zustand, decimal.js, and Vitest.
- Add supplied data.
- Define schemas and loader.

### 0:25–1:15 — Domain rules and tests

- Define domain types.
- Implement integrity checks.
- Implement bid and quote eligibility.
- Implement monetary calculations.
- Add focused tests for the known edge cases.

### 1:15–1:45 — Draft state and persistence

- Define minimal Zustand store.
- Add persist middleware.
- Add versioned storage key.
- Validate restored state.
- Add hydration status.

### 1:45–3:10 — Comparison and selection UI

- Build page shell.
- Build line-item sections and quote options.
- Render eligibility explanations.
- Wire selections and auto-save state.
- Build award summary.

### 3:10–3:40 — Award-plan generation and verification

- Implement complete/incomplete result.
- Verify shipping and totals.
- Add tests for split award and invalid selections.
- Add optional JSON display/copy only if time remains.

### 3:40–4:00 — Cleanup and documentation

- Run lint, type-check, and tests.
- Remove temporary TODOs.
- Verify refresh persistence manually.
- Add concise README technology decisions, assumptions, trade-offs, and unfinished work.
- Rehearse the interview demo flow.

---

## 17. Definition of done

The MVP is done when:

- All supplied RFQ line items and partner choices are visible.
- Every ineligibility reason is correct and understandable.
- Only eligible quotes can be selected.
- One selection per line item is enforced.
- Split awards work.
- Totals are correct and shipping is charged once per selected bid.
- Partial drafts survive refresh.
- Invalid stored selections are visible and excluded from completion.
- A complete award plan is available only for complete valid selections.
- Core domain tests pass.
- Type-check and lint pass.
- The architecture and every dependency can be explained in one sentence.

---

## 18. Interview demonstration flow

1. Explain the domain: RFQ -> bids -> line-item quotes -> award plan.
2. Show all partner choices for one line item.
3. Explain one eligible and one ineligible quote.
4. Select two line items from one partner and show shipping charged once.
5. Split the award across another partner.
6. Refresh the browser and show restored draft selections.
7. Demonstrate incomplete-plan messaging.
8. Complete all selections and show the grouped award plan.
9. Walk through the pure domain layer and key tests.
10. Explain trade-offs:
    - Why local JSON instead of a mock API.
    - Why localStorage is sufficient.
    - Why Zustand was used.
    - Why TanStack Query, Redux, Prisma, and a backend were not used.
    - Why decimal arithmetic was used.
