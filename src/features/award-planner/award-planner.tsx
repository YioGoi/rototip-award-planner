"use client";

import type { CaseStudy } from "@/domain/schemas";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { createAwardDraftStore } from "@/store/award-draft-store";
import {
    LineItemSection,
} from "./line-item-section";
import { DraftStatus } from "./draft-status";
import { AwardSummary } from "./award-summary";
import {
    formatDateTime,
} from "@/lib/formatters";
import {
    validateDraftSelections,
} from "@/domain/selections";
import {
    buildAwardPlan,
} from "@/domain/award-plan";


type AwardPlannerProps = {
    caseStudy: CaseStudy;
};

export function AwardPlanner({
    caseStudy,
}: AwardPlannerProps) {
    const { rfq } = caseStudy;
    // Keep one RFQ-specific store instance for this mounted planner.
    // Recreating it during render would discard state and subscriptions on each re-render.
    const [draftStore] = useState(() =>
        createAwardDraftStore(rfq.id),
    );

    const hasHydrated = useStore(
        draftStore,
        (state) => state.hasHydrated,
    );

    const selections = useStore(
        draftStore,
        (state) => state.selections,
    );

    const selectBidForLineItem = useStore(
        draftStore,
        (state) => state.selectBidForLineItem,
    );

    const removeSelection = useStore(
        draftStore,
        (state) => state.removeSelection,
    );

    const resetDraft = useStore(
        draftStore,
        (state) => state.resetDraft,
    );

    const selectionValidation =
        validateDraftSelections(
            caseStudy,
            selections,
        );

    const validSelectionCount = Object.keys(
        selectionValidation.validSelections,
    ).length;

    const storedSelectionCount =
        Object.keys(selections).length;

    // Persist user decisions, not derived business results. Rebuilding the plan from
    // the current case-study data prevents stale prices, eligibility, or totals from
    // being stored in the browser.
    // The server render intentionally starts with an empty draft. Build the plan only
    // after Zustand restores the browser draft so the pre-hydration state cannot be
    // mistaken for the user's actual award decision.
    const awardPlanResult = hasHydrated
        ? buildAwardPlan(caseStudy, selections)
        : null;

    // Defer Zustand rehydration until after React hydrates the server-rendered HTML.
    // This keeps the server and client's first render aligned before restoring localStorage.
    useEffect(() => {
        void draftStore.persist.rehydrate();
    }, [draftStore]);

    return (
        <main className="mx-auto min-h-screen max-w-7xl px-6 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Rototip
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {rfq.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                {rfq.id} · {rfq.customerReference}
            </p>
            <p className="mt-2 text-sm text-slate-500">
                Evaluated at{" "}
                {formatDateTime(
                    caseStudy.metadata.evaluationTimestamp,
                )}{" "}
                UTC
            </p>
            {/* 
                Keep selection-dependent UI hidden until the persisted draft is restored,
                avoiding a misleading empty-draft flash during initial hydration. 
            */}
            <DraftStatus
                hasHydrated={hasHydrated}
                validSelectionCount={validSelectionCount}
                totalLineItemCount={rfq.lineItems.length}
                storedSelectionCount={storedSelectionCount}
                invalidSelections={
                    selectionValidation.invalidSelections
                }
                onRemoveSelection={removeSelection}
                onReset={resetDraft}
            />
            <AwardSummary result={awardPlanResult} />
            <div className="mt-10 space-y-8">
                {rfq.lineItems.map((lineItem) => (
                    <LineItemSection
                        key={lineItem.id}
                        lineItem={lineItem}
                        bids={caseStudy.bids}
                        partners={caseStudy.partners}
                        evaluationTimestamp={
                            caseStudy.metadata.evaluationTimestamp
                        }
                        selectedBidId={selections[lineItem.id]}
                        hasHydrated={hasHydrated}
                        onSelectBid={(bidId) => {
                            selectBidForLineItem(
                                lineItem.id,
                                bidId,
                            );
                        }}
                        onClearSelection={() => {
                            removeSelection(lineItem.id);
                        }}
                    />
                ))}
            </div>
        </main>
    );
}