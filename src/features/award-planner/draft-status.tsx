import type {
    InvalidSelection,
} from "@/domain/selections";
import {
    getEligibilityIssueMessage,
} from "./eligibility-message";

type DraftStatusProps = {
    hasHydrated: boolean;
    validSelectionCount: number;
    totalLineItemCount: number;
    storedSelectionCount: number;
    invalidSelections: InvalidSelection[];
    onRemoveSelection: (lineItemId: string) => void;
    onReset: () => void;
};

function getInvalidSelectionMessage(
    selection: InvalidSelection,
): string {
    switch (selection.code) {
        case "SELECTION_LINE_ITEM_NOT_FOUND":
            return `Line item ${selection.lineItemId} no longer exists in this RFQ.`;

        case "SELECTION_BID_NOT_FOUND":
            return `Bid ${selection.bidId} no longer exists.`;

        case "SELECTION_QUOTE_INELIGIBLE":
            return `Bid ${selection.bidId} is no longer eligible for line item ${selection.lineItemId}.`;
    }

    const exhaustiveCheck: never = selection;
    return exhaustiveCheck;
}

export function DraftStatus({
    hasHydrated,
    validSelectionCount,
    totalLineItemCount,
    storedSelectionCount,
    invalidSelections,
    onRemoveSelection,
    onReset,
}: DraftStatusProps) {
    if (!hasHydrated) {
        return (
            <p
                aria-live="polite"
                className="mt-4 text-sm text-slate-500"
            >
                Restoring draft…
            </p>
        );
    }

    return (
        <aside
            aria-label="Draft status"
            aria-live="polite"
            className="mt-5 rounded-xl border border-slate-200 bg-white p-4"
        >
            <p className="font-medium text-slate-950">
                {validSelectionCount} of{" "}
                {totalLineItemCount} valid selections
            </p>

            <p className="mt-1 text-sm text-slate-600">
                {storedSelectionCount > 0
                    ? "Draft saved in this browser."
                    : "No draft selections yet."}
            </p>

            {invalidSelections.length > 0 && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-800">
                    <p className="text-sm font-medium">
                        {invalidSelections.length} saved{" "}
                        {invalidSelections.length === 1
                            ? "selection needs"
                            : "selections need"}{" "}
                        attention.
                    </p>

                    <ul className="mt-3 space-y-4">
                        {invalidSelections.map((selection) => (
                            <li
                                key={`${selection.lineItemId}-${selection.bidId}`}
                                className="text-sm"
                            >
                                <p>
                                    {getInvalidSelectionMessage(
                                        selection,
                                    )}
                                </p>

                                {selection.code ===
                                    "SELECTION_QUOTE_INELIGIBLE" && (
                                        <ul className="mt-2 list-disc space-y-1 pl-5">
                                            {selection.issues.map(
                                                (issue, index) => (
                                                    <li
                                                        key={`${issue.code}-${index}`}
                                                    >
                                                        {getEligibilityIssueMessage(
                                                            issue,
                                                        )}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        onRemoveSelection(
                                            selection.lineItemId,
                                        );
                                    }}
                                    className="mt-2 font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                                >
                                    Remove saved selection
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {storedSelectionCount > 0 && (
                <button
                    type="button"
                    onClick={onReset}
                    className="mt-4 text-sm font-medium text-red-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                >
                    Reset draft
                </button>
            )}
        </aside>
    );
}
