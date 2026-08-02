import { describe, expect, it, vi } from "vitest";
import {
    createAwardDraftPersistStorage,
    createAwardDraftStore,
} from "@/store/award-draft-store";
import {
    getAwardDraftStorageKey,
    type PersistedDraft,
} from "@/store/persisted-draft-schema";
import {
    loadCaseStudy,
} from "@/data/load-case-study";
import {
    validateDraftSelections,
} from "@/domain/selections";

function createMemoryStorage() {
    const values = new Map<string, string>();

    return {
        getItem: vi.fn(
            (key: string) => values.get(key) ?? null,
        ),
        setItem: vi.fn(
            (key: string, value: string) => {
                values.set(key, value);
            },
        ),
        removeItem: vi.fn((key: string) => {
            values.delete(key);
        }),
    };
}

describe("createAwardDraftPersistStorage", () => {
    it("writes the plain draft envelope without the Zustand wrapper", () => {
        const rfqId = "RFQ-2026-1042";
        const storageKey =
            getAwardDraftStorageKey(rfqId);
        const storage = createMemoryStorage();
        const persistStorage =
            createAwardDraftPersistStorage(
                storage,
                rfqId,
            );

        const draft: PersistedDraft = {
            version: 1,
            rfqId,
            selections: {
                "LI-001": "BID-002",
            },
        };

        persistStorage.setItem(storageKey, {
            state: draft,
            version: 1,
        });

        const rawValue = storage.getItem(storageKey);

        expect(rawValue).toBe(JSON.stringify(draft));
        expect(JSON.parse(rawValue!)).not.toHaveProperty(
            "state",
        );
    });

    it("converts a valid stored envelope into Zustand's internal format", () => {
        const rfqId = "RFQ-2026-1042";
        const storageKey =
            getAwardDraftStorageKey(rfqId);
        const storage = createMemoryStorage();

        const draft: PersistedDraft = {
            version: 1,
            rfqId,
            selections: {
                "LI-001": "BID-002",
            },
        };

        storage.setItem(
            storageKey,
            JSON.stringify(draft),
        );

        const persistStorage =
            createAwardDraftPersistStorage(
                storage,
                rfqId,
            );

        expect(
            persistStorage.getItem(storageKey),
        ).toStrictEqual({
            state: draft,
            version: 1,
        });
    });
});

describe("createAwardDraftStore", () => {
    it("marks hydration complete when no stored draft exists", async () => {
        const storage = createMemoryStorage();

        const store = createAwardDraftStore(
            "RFQ-2026-1042",
            storage,
        );

        await store.persist.rehydrate();

        expect(store.getState()).toMatchObject({
            selections: {},
            hasHydrated: true,
        });
    });

    it("restores selections only after explicit hydration", async () => {
        const rfqId = "RFQ-2026-1042";
        const storageKey =
            getAwardDraftStorageKey(rfqId);
        const storage = createMemoryStorage();

        const storedDraft: PersistedDraft = {
            version: 1,
            rfqId,
            selections: {
                "LI-003": "BID-002",
            },
        };

        storage.setItem(
            storageKey,
            JSON.stringify(storedDraft),
        );

        const store = createAwardDraftStore(
            rfqId,
            storage,
        );

        expect(store.getState()).toMatchObject({
            selections: {},
            hasHydrated: false,
        });

        await store.persist.rehydrate();

        expect(store.getState()).toMatchObject({
            selections: storedDraft.selections,
            hasHydrated: true,
        });
    });

    it("ignores malformed storage without overwriting it during hydration", async () => {
        const rfqId = "RFQ-2026-1042";
        const storageKey =
            getAwardDraftStorageKey(rfqId);
        const storage = createMemoryStorage();
        const malformedValue = "{broken";

        storage.setItem(storageKey, malformedValue);

        // Keep the stored value but clear the setup call history.
        storage.setItem.mockClear();

        const store = createAwardDraftStore(
            rfqId,
            storage,
        );

        await store.persist.rehydrate();

        expect(store.getState()).toMatchObject({
            selections: {},
            hasHydrated: true,
        });

        expect(storage.getItem(storageKey)).toBe(
            malformedValue,
        );
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it("persists selection decisions as a plain draft envelope", async () => {
        const rfqId = "RFQ-2026-1042";
        const storageKey =
            getAwardDraftStorageKey(rfqId);
        const storage = createMemoryStorage();
        const store = createAwardDraftStore(
            rfqId,
            storage,
        );

        await store.persist.rehydrate();
        storage.setItem.mockClear();

        store
            .getState()
            .selectBidForLineItem(
                "LI-001",
                "BID-002",
            );

        expect(store.getState().selections).toStrictEqual({
            "LI-001": "BID-002",
        });

        const rawValue = storage.getItem(storageKey);

        expect(JSON.parse(rawValue!)).toStrictEqual({
            version: 1,
            rfqId,
            selections: {
                "LI-001": "BID-002",
            },
        });

        expect(JSON.parse(rawValue!)).not.toHaveProperty(
            "hasHydrated",
        );
    });

    it("replaces, removes, and resets draft selections", async () => {
        const rfqId = "RFQ-2026-1042";
        const storageKey =
            getAwardDraftStorageKey(rfqId);
        const storage = createMemoryStorage();
        const store = createAwardDraftStore(
            rfqId,
            storage,
        );

        await store.persist.rehydrate();

        store
            .getState()
            .selectBidForLineItem(
                "LI-001",
                "BID-001",
            );

        store
            .getState()
            .selectBidForLineItem(
                "LI-002",
                "BID-003",
            );

        store
            .getState()
            .selectBidForLineItem(
                "LI-001",
                "BID-002",
            );

        expect(store.getState().selections).toStrictEqual({
            "LI-001": "BID-002",
            "LI-002": "BID-003",
        });

        store.getState().removeSelection("LI-002");

        expect(store.getState().selections).toStrictEqual({
            "LI-001": "BID-002",
        });

        store.getState().resetDraft();

        expect(store.getState()).toMatchObject({
            rfqId,
            selections: {},
            hasHydrated: true,
        });

        expect(
            JSON.parse(storage.getItem(storageKey)!),
        ).toStrictEqual({
            version: 1,
            rfqId,
            selections: {},
        });
    });

    it("keeps an invalid restored selection until the user removes it", async () => {
        const loadResult = loadCaseStudy();

        if (!loadResult.success) {
            throw new Error(
                "Test fixture could not be loaded",
            );
        }

        const caseStudy = loadResult.data;
        const rfqId = caseStudy.rfq.id;
        const storageKey =
            getAwardDraftStorageKey(rfqId);
        const storage = createMemoryStorage();

        const storedDraft: PersistedDraft = {
            version: 1,
            rfqId,
            selections: {
                "LI-003": "BID-002",
            },
        };

        storage.setItem(
            storageKey,
            JSON.stringify(storedDraft),
        );

        const store = createAwardDraftStore(
            rfqId,
            storage,
        );

        await store.persist.rehydrate();

        expect(store.getState().selections).toStrictEqual(
            storedDraft.selections,
        );

        expect(
            validateDraftSelections(
                caseStudy,
                store.getState().selections,
            ).invalidSelections,
        ).toHaveLength(1);

        store
            .getState()
            .removeSelection("LI-003");

        expect(store.getState().selections).toStrictEqual(
            {},
        );

        expect(
            JSON.parse(storage.getItem(storageKey)!),
        ).toMatchObject({
            selections: {},
        });
    });
});
