import { describe, expect, it, vi } from "vitest";
import {
    getAwardDraftStorageKey,
    parsePersistedDraft,
    readPersistedDraft,
} from "@/store/persisted-draft-schema";

describe("parsePersistedDraft", () => {
    it("accepts a valid persisted draft", () => {
        const draft = {
            version: 1,
            rfqId: "RFQ-2026-1042",
            selections: {
                "LI-001": "BID-002",
            },
        };

        expect(
            parsePersistedDraft(JSON.stringify(draft)),
        ).toStrictEqual(draft);
    });

    it("returns null for malformed JSON", () => {
        expect(parsePersistedDraft("{broken")).toBeNull();
    });

    it("returns null for an unsupported version", () => {
        const unsupportedDraft = {
            version: 2,
            rfqId: "RFQ-2026-1042",
            selections: {},
        };

        expect(
            parsePersistedDraft(
                JSON.stringify(unsupportedDraft),
            ),
        ).toBeNull();
    });
});

describe("readPersistedDraft", () => {
    it("reads the draft from its RFQ-specific key", () => {
        const draft = {
            version: 1,
            rfqId: "RFQ-2026-1042",
            selections: {
                "LI-001": "BID-002",
            },
        };

        const storage = {
            getItem: vi.fn(() => JSON.stringify(draft)),
        };

        expect(
            readPersistedDraft(storage, draft.rfqId),
        ).toStrictEqual(draft);

        expect(storage.getItem).toHaveBeenCalledWith(
            getAwardDraftStorageKey(draft.rfqId),
        );
    });

    it("ignores an envelope belonging to another RFQ", () => {
        const storage = {
            getItem: vi.fn(() =>
                JSON.stringify({
                    version: 1,
                    rfqId: "RFQ-OTHER",
                    selections: {
                        "LI-001": "BID-002",
                    },
                }),
            ),
        };

        expect(
            readPersistedDraft(
                storage,
                "RFQ-2026-1042",
            ),
        ).toBeNull();
    });
});
