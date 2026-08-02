import { z } from "zod";

export const PERSISTED_DRAFT_VERSION = 1 as const;

export const draftSelectionsSchema = z.record(
    z.string().min(1),
    z.string().min(1),
);

export const persistedDraftSchema = z.strictObject({
    version: z.literal(PERSISTED_DRAFT_VERSION),
    rfqId: z.string().min(1),
    selections: draftSelectionsSchema,
});

type DraftStorageReader = Pick<Storage, "getItem">;

export type PersistedDraft = z.infer<
    typeof persistedDraftSchema
>;

export function parsePersistedDraft(
    rawValue: string | null,
): PersistedDraft | null {
    if (rawValue === null) {
        return null;
    }

    try {
        const parsedValue: unknown = JSON.parse(rawValue);
        const result =
            persistedDraftSchema.safeParse(parsedValue);

        return result.success ? result.data : null;
    } catch {
        return null;
    }
}

export function getAwardDraftStorageKey(
    rfqId: string,
): string {
    return `rototip-award-draft:${rfqId}:v${PERSISTED_DRAFT_VERSION}`;
}

export function readPersistedDraft(
    storage: DraftStorageReader,
    rfqId: string,
): PersistedDraft | null {
    const storageKey = getAwardDraftStorageKey(rfqId);
    const draft = parsePersistedDraft(
        storage.getItem(storageKey),
    );

    // The storage key scopes drafts by RFQ, but the stored envelope is still untrusted.
    // Recheck its RFQ ID and ignore mismatches without deleting browser data during a read.
    if (draft?.rfqId !== rfqId) {
        return null;
    }

    return draft;
}