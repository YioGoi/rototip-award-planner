import type {
    EligibilityIssue,
    EligibilityResult,
} from "@/domain/eligibility";
import { formatDateTime } from "@/lib/formatters";

export function getEligibilityIssueMessage(
    issue: EligibilityIssue,
): string {
    switch (issue.code) {
        case "BID_NOT_SUBMITTED":
            return `Bid status is ${issue.status.toLowerCase()}.`;

        case "BID_EXPIRED":
            return `Bid expired at ${formatDateTime(issue.validUntil)} UTC.`;

        case "MISSING_QUOTE":
            return "No quote was submitted for this line item.";

        case "INVALID_UNIT_PRICE":
            return `Unit price must be greater than zero; received ${issue.unitPrice}.`;

        case "INVALID_SETUP_FEE":
            return `Setup fee cannot be negative; received ${issue.setupFee}.`;

        case "MOQ_EXCEEDS_QUANTITY":
            return `Minimum order quantity (${issue.minimumOrderQuantity}) exceeds the requested quantity (${issue.quantity}).`;

        case "LEAD_TIME_EXCEEDS_REQUIREMENT":
            return `Lead time (${issue.leadTimeDays} days) exceeds the requirement (${issue.requiredLeadTimeDays} days).`;
    }

    // If the domain adds a new eligibility issue type, this code will not compile
    // until the switch handles it, preventing new ineligibility reasons from being
    // silently omitted from the UI.
    const exhaustiveCheck: never = issue;
    return exhaustiveCheck;
}

type EligibilityMessageProps = {
    result: EligibilityResult;
    id?: string;
};

export function EligibilityMessage({
    result,
    id,
}: EligibilityMessageProps) {
    if (result.eligible) {
        return (
            <p
                id={id}
                className="text-sm font-medium text-emerald-700"
            >
                Eligible
            </p>
        );
    }

    return (
        <div id={id}>
            <p className="text-sm font-medium text-red-700">
                Not eligible
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                {result.issues.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>
                        {getEligibilityIssueMessage(issue)}
                    </li>
                ))}
            </ul>
        </div>
    );
}
