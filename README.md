# Rototip bid comparison and award plan case study

## The scenario

Rototip helps manufacturing companies source custom parts from manufacturing partners. For this exercise, a customer request for quotation (RFQ) has received bids from several partners. The operations team needs a small web application for comparing the bids and preparing an award plan.

Your job is to turn the supplied data into a clear, reliable decision-making interface.

## Dictionary

- **RFQ (request for quotation):** A customer's request to manufacture one or more parts under a set of commercial and technical requirements.
- **Line item:** One requested part and quantity within an RFQ. Each line item can be quoted and awarded separately.
- **Manufacturing partner (partner):** A supplier that can manufacture some or all of the RFQ line items.
- **Bid:** A manufacturing partner's response to the RFQ. A bid carries its status, validity, shipping fee, and one or more line-item quotes.
- **Quote:** A partner's price and delivery terms for a specific line item within a bid.
- **Award plan:** The operations team's proposed selection of one eligible quote for every line item, grouped by the partners that would receive the work.

## Expected effort

We expect this exercise to take approximately **four hours of focused work**. You may divide the work across sessions and organize your time however you prefer. Four hours is our estimate of the intended scope, not a hard limit.

Use your own judgment to decide when the work is done. Spending substantially more than four hours is not expected and will not earn additional credit; it may mean the solution has gone beyond the useful scope of the exercise. Spending less is fine, although an unfinished solution may give us less evidence to assess. Be prepared to tell us your approximate total time during the interview.

We value a focused, dependable solution more than an unexplained, overbuilt one.

## Technology

Choose any language, framework, libraries, and development tools you consider appropriate. We do not provide a starter application.

When useful, we recommend tools similar to our current stack: TypeScript, Next.js, Tailwind CSS, an ORM such as Prisma, Drizzle, or Kysely, and appropriate state-management and form-validation libraries. Our stack is not set in stone; we are always interested in better tools and thoughtful alternatives.

Be prepared to give a one-sentence explanation for each meaningful technology choice and to walk us through why you chose a particular language, framework, or library.

You may use documentation, search engines, and AI-assisted development tools. You must be able to explain the resulting application and how you verified AI-generated work. Full prompt transcripts are not required.

Do not call external services. Everything needed for the exercise is in [`data/case-study.json`](data/case-study.json). Feel free to modify the data json any way you might need.

## What to build

Build a web application that lets an operations user:

1. Review the RFQ line items and the bids received from every manufacturing partner.
2. Compare price, lead time, partner information, and bid validity.
3. Select exactly one eligible quote for each line item.
4. Split the award across multiple partners when useful.
5. See why a bid or line-item quote is not eligible.
6. See the selected subtotal for each partner, that partner's shipping fee, and the complete award total in EUR.
7. Save an incomplete draft and retain it after a browser refresh.
8. Produce a complete award-plan summary only after every line item has an eligible selection.

The award-plan summary may be presented in the interface or as downloadable JSON. It should group the selected line items by partner and contain enough information for another system to create the awards.

## Business rules

### Time and bid eligibility

- Treat `metadata.evaluationTimestamp` as the current time for the entire exercise. Do not use the actual clock.
- All timestamps are ISO 8601 timestamps in UTC.
- `validUntil` is an exclusive cutoff. A bid is expired when `evaluationTimestamp` is equal to or later than `validUntil`.
- A bid is eligible only when its `status` is `SUBMITTED` and it has not expired.
- Keep ineligible bids visible, but do not allow users to select them. Explain the reason in the interface.

### Line-item quote eligibility

A line-item quote is eligible only when all of the following are true:

- Its parent bid is eligible.
- `unitPrice` is greater than zero.
- `setupFee` is zero or greater.
- `minimumOrderQuantity` is less than or equal to the RFQ line item's `quantity`.
- `leadTimeDays` is less than or equal to the RFQ line item's `requiredLeadTimeDays`.

If a partner has not quoted a line item, that partner cannot be selected for it. Keep missing and ineligible choices understandable to the user rather than silently hiding them.

### Money and totals

- All monetary amounts in the supplied dataset are in EUR.
- A selected line-item total is:

  ```text
  unitPrice * RFQ quantity + setupFee
  ```

- Charge a bid's `shippingFee` once when at least one line item from that bid is selected. Do not charge it once per line item.
- Round displayed and award-plan monetary totals to two decimal places.

The cheapest plan is not necessarily the best plan. Partner reliability, lead time, and notes are decision inputs, but you do not need to implement an automatic recommendation algorithm.

### Draft and award plan

- A draft may contain no selections or only some line-item selections.
- A line item may have at most one selected quote.
- A complete award plan requires one eligible selection for every RFQ line item.
- If a saved selection is no longer eligible, the application must not include it in a complete award plan and should make the problem visible.

## Minimum engineering expectations

- Keep business rules separate enough from the interface that they can be explained clearly.
- Provide useful empty, invalid, and incomplete-selection states.

Responsive layout, keyboard interaction, and additional accessibility work are welcome, but they are not required for the MVP.

A backend, authentication, database, file uploads, deployment, and pixel-perfect visual design are **not required**. Browser storage is sufficient for draft persistence.

## Nice-to-have extensions

If the MVP is complete and you have time left, you may extend the application with one of the following:

- Multi-currency bids and conversion into a chosen base currency (EUR)
- Responsive or keyboard-focused interaction improvements
- An alternative persistence approach
- A live deployment in any platform or self-hosted
- Dockerizing the app and any other tools used
- Any other improvement you can justify in terms of user or business value

Nice-to-have work does not compensate for missing MVP behavior.

## Second-round interview

You do not need to submit source code or any other files to us. During the second-round technical interview, you will share your screen and demonstrate the application running in your own environment.

Be prepared to:

- Demonstrate the comparison, selection, draft, and award-plan flows.
- Walk through the application's structure and business-rule boundaries.
- Explain your main technology choices in a sentence each, with more detail where useful.
- Explain tradeoffs and unfinished work.
- Discuss how you verified calculations and AI-generated code.
- Discuss hypothetically how you would add a small feature or respond to a requirement change. You will not be asked to implement the change during the meeting.

There is no single expected visual design or framework choice. We are assessing how you translate business requirements into a dependable, understandable product slice.
