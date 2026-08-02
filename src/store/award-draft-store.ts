import { createStore } from "zustand/vanilla";
import {
    persist,
    type PersistStorage,
} from "zustand/middleware";
import type { DraftSelections } from "@/domain/selections";
import {
    getAwardDraftStorageKey,
    PERSISTED_DRAFT_VERSION,
    persistedDraftSchema,
    readPersistedDraft,
    type PersistedDraft,
} from "@/store/persisted-draft-schema";

export type AwardDraftState = {
    rfqId: string;
    selections: DraftSelections;
    hasHydrated: boolean;
};

export type AwardDraftActions = {
    selectBidForLineItem: (
        lineItemId: string,
        bidId: string,
    ) => void;
    removeSelection: (lineItemId: string) => void;
    resetDraft: () => void;
};

export type AwardDraftStore =
    AwardDraftState & AwardDraftActions;

export function createInitialAwardDraftState(
    rfqId: string,
): AwardDraftState {
    return {
        rfqId,
        selections: {},
        hasHydrated: false,
    };
}

type DraftStorage = Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
>;

const unavailableDraftStorage: DraftStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
};

function getDefaultDraftStorage(): DraftStorage {
    if (typeof window === "undefined") {
        return unavailableDraftStorage;
    }

    try {
        return window.localStorage;
    } catch {
        return unavailableDraftStorage;
    }
}

export function createAwardDraftPersistStorage(
    storage: DraftStorage,
    rfqId: string,
): PersistStorage<PersistedDraft> {
    return {
        getItem: () => {
            const draft = readPersistedDraft(
                storage,
                rfqId,
            );

            if (draft === null) {
                return null;
            }

            return {
                state: draft,
                version: draft.version,
            };
        },

        setItem: (storageKey, value) => {
            storage.setItem(
                storageKey,
                JSON.stringify(value.state),
            );
        },

        removeItem: (storageKey) => {
            storage.removeItem(storageKey);
        },
    };
}

// Keep each RFQ in its own store instance instead of sharing a module-level store.
// A combined state can still be immutable, but every action must scope updates to the
// correct RFQ and copy each changed level without mutating nested selections.
// Per-RFQ stores make that isolation structural and align each store with one storage key.
export function createAwardDraftStore(
    rfqId: string,
    storage: DraftStorage = getDefaultDraftStorage(),
) {
    const initialState =
        createInitialAwardDraftState(rfqId);

    return createStore<AwardDraftStore>()(
        persist<
            AwardDraftStore,
            [],
            [],
            PersistedDraft
        >(
            (set) => ({
                ...initialState,

                selectBidForLineItem: (
                    lineItemId,
                    bidId,
                ) => {
                    set((state) => ({
                        selections: {
                            ...state.selections,
                            [lineItemId]: bidId,
                        },
                    }));
                },

                removeSelection: (lineItemId) => {
                    set((state) => ({
                        selections: Object.fromEntries(
                            Object.entries(
                                state.selections,
                            ).filter(
                                ([candidateLineItemId]) =>
                                    candidateLineItemId !==
                                    lineItemId,
                            ),
                        ),
                    }));
                },

                resetDraft: () => {
                    set({ selections: {} });
                },
            }),
            {
                name: getAwardDraftStorageKey(rfqId),
                version: PERSISTED_DRAFT_VERSION,
                storage:
                    createAwardDraftPersistStorage(
                        storage,
                        rfqId,
                    ),

                partialize: (state) => ({
                    version: PERSISTED_DRAFT_VERSION,
                    rfqId: state.rfqId,
                    selections: state.selections,
                }),

                merge: mergePersistedDraftState,

                // Defer storage hydration until after the client mounts, keeping the server and
                // client's initial render aligned and reducing the risk of hydration mismatches.
                skipHydration: true,
            },
        ),
    );
}

export function mergePersistedDraftState(
    persistedState: unknown,
    currentState: AwardDraftStore,
): AwardDraftStore {
    const result =
        persistedDraftSchema.safeParse(persistedState);

    if (
        !result.success ||
        result.data.rfqId !== currentState.rfqId
    ) {
        return {
            ...currentState,
            hasHydrated: true,
        };
    }

    return {
        ...currentState,
        selections: result.data.selections,
        hasHydrated: true,
    };
}

