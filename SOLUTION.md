# Rototip Award Planner — Solution Overview

## Summary

I built this application to turn the supplied RFQ dataset into a focused decision-support interface for comparing manufacturing bids and preparing an award plan.

It lets an operations user inspect every partner option, understand why a quote is unavailable, select one eligible quote per RFQ line item, split work across partners, save an incomplete browser draft, see a live cost preview, and produce a final grouped award summary only after the selection is complete.

## Run

Requirements:

- Node.js compatible with Next.js 16.
- `pnpm` (the project records `pnpm@10.28.2`).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Quality checks:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## What the application does

- Displays the RFQ and all four requested line items.
- Keeps all five partner bids visible for comparison.
- Shows partner quality, on-time delivery, bid validity, prices, fees, MOQ, lead time, and notes.
- Disables ineligible and missing quotes while explaining every reason.
- Enforces at most one selected quote per line item.
- Supports split awards across partners.
- Persists partial selections in the browser and restores them after refresh.
- Shows a valid-only cost preview while the draft is incomplete.
- Groups the completed award by partner and bid with shipping charged once per selected bid.
- Uses native radio groups, fieldset/legend semantics, labelled regions, described eligibility states, and visible keyboard focus styles.

## Architecture

```text
case-study.json
      |
      v
Zod shape validation + relationship integrity checks
      |
      v
Next.js Server Component
      |
      v
AwardPlanner Client Component
      |
      +--> Zustand + versioned localStorage selections
      |
      +--> pure domain rules and Decimal.js calculations
      |
      v
Comparison UI + draft preview + final award summary
```

The main design rule I followed is:

> Persist user decisions; derive business results.

I persist only the user's selections. Eligibility, totals, partner groupings, shipping, and final award output are recalculated from the current validated dataset.

## Domain model

- **RFQ:** the customer's overall request.
- **Line item:** one requested part, quantity, and delivery requirement within the RFQ.
- **Partner:** a manufacturing supplier.
- **Bid:** a partner's commercial response containing status, validity, shipping, notes, and line-item quotes.
- **Quote:** price and delivery terms for one line item inside a bid.
- **Award plan:** exactly one eligible quote for every RFQ line item, grouped by the partners receiving the work.

The draft state maps each selected line item to a bid:

```ts
type DraftSelections = Record<LineItemId, BidId>;
```

## Important business rules

### Eligibility

- The supplied `evaluationTimestamp` is used instead of the real clock.
- `validUntil` is exclusive: equality means expired.
- A bid must be `SUBMITTED` and unexpired.
- A quote needs a positive unit price, non-negative setup fee, acceptable MOQ, and acceptable lead time.
- Missing and ineligible choices remain visible but cannot be selected.

### Money and shipping

```text
line total = unit price * RFQ quantity + setup fee
```

Shipping belongs to a bid. It is added once when at least one quote from that bid is selected, regardless of how many selected line items that bid contains.

Decimal.js keeps intermediate arithmetic deterministic. Display and output values are rounded to two decimal places with `ROUND_HALF_UP`.

### Draft preview versus final plan

An incomplete draft may still contain commercially useful valid selections. I therefore show a **Draft cost preview** with current line totals, partner subtotals, shipping, and draft total.

The distinction remains explicit:

```text
Incomplete valid selections -> cost preview only
One eligible selection per line item -> final award plan
```

Invalid restored selections are visible to the user but excluded from both preview and final totals.

## Persistence model

I create one Zustand store per RFQ. Its persisted envelope contains:

```ts
{
    version: 1,
    rfqId: string,
    selections: Record<string, string>,
}
```

The persistence layer:

- Uses an RFQ-specific versioned storage key.
- Validates stored JSON with Zod.
- Safely ignores corrupt or mismatched envelopes.
- Revalidates restored selections against current bid and quote rules.
- Defers hydration until after client mount to keep server and initial client rendering aligned.

## Technology choices

- **Next.js App Router:** I used it for a clear server/client boundary and alignment with the suggested stack.
- **TypeScript:** I used explicit domain types and discriminated result states to make invalid states harder to represent.
- **React:** I used native interactive controls for the line-item comparison and selection flow.
- **Tailwind CSS:** I used it for fast, consistent styling without adding a UI framework.
- **Zod:** I validate both the source JSON and persisted browser data at runtime.
- **Zustand:** I chose it for the small, focused shared draft state and persistence support.
- **Decimal.js:** I use predictable base-10 arithmetic for monetary calculations.
- **Vitest:** I use focused tests around pure domain logic, persistence, and rendered summary states.

## Tests

I wrote 61 tests across 10 test files.

They cover:

- Dataset schemas and cross-record integrity.
- Bid and quote eligibility edge cases.
- Money, fractional prices, rounding, and shipping-once behavior.
- Empty, partial, invalid, split, and complete award states.
- Draft storage validation, RFQ isolation, hydration, and reset.
- Eligibility messages and award-summary rendering.
- Partial draft cost preview and final award output.

I did not add an automated browser E2E suite. I covered the business-critical rules below the browser layer and used a final manual smoke flow for selection, refresh persistence, and visual verification.

## Trade-offs

- **Local JSON instead of an API:** I kept the supplied local-data boundary rather than adding fake infrastructure.
- **Browser persistence instead of a backend:** I used `localStorage` because the requested draft behavior is single-user and browser-local.
- **Zustand instead of Redux:** the shared state is only an RFQ ID, selections, and hydration status.
- **No TanStack Query:** I did not add a remote-state library when there is no remote asynchronous state.
- **No automatic recommendation:** I kept the decision with the operations user because cheapest is not necessarily best.
- **No downloadable JSON:** I used the complete in-interface summary; an export can be added without changing the domain calculation.
- **Single currency:** I kept the MVP in EUR because that is the supplied exercise boundary.

## Approximate focused time

I spent approximately five focused hours across multiple sessions. I used AI as a pair-programming partner for discussion and review, while working through the implementation hands-on so that I could understand and explain every decision in the code.

## What I would add in production

- A backend API and database for shared drafts and finalized awards.
- Authentication, authorization, and an audit trail for award decisions.
- Optimistic concurrency or version checks for simultaneous operations users.
- Automated browser E2E coverage for selection and refresh flows.
- Monitoring and structured error reporting.
- Currency normalization if multi-currency RFQs become a requirement.
- Export or downstream award-creation integration using the existing domain result.

## Demo flow

1. Explain the RFQ, line item, partner, bid, and quote hierarchy.
2. Show an eligible quote and an ineligible quote with its reason.
3. Select two line items from the same bid and show shipping charged once.
4. Refresh and show that the incomplete draft and preview return.
5. Split the remaining work across another partner.
6. Complete the plan and show the final partner and bid totals.
7. Open `src/domain/eligibility.ts`, `src/domain/award-plan.ts`, and the focused tests.
8. Close with the technology choices and trade-offs above.
