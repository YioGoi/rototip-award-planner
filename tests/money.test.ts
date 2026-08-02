import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { calculateLineItemTotal, toMoneyNumber } from "@/domain/money";

describe("calculateLineItemTotal", () => {
    it("calculates unit price times quantity plus setup fee", () => {
        const unitPrice = 46.8;
        const quantity = 120;
        const setupFee = 350;

        const result = calculateLineItemTotal({
            unitPrice,
            quantity,
            setupFee,
        });

        expect(result.toString()).toBe("5966");
    });

    it("keeps fractional unit price arithmetic exact", () => {
        const unitPrice = 39.744;
        const quantity = 120;
        const setupFee = 460;

        const result = calculateLineItemTotal({
            unitPrice,
            quantity,
            setupFee,
        });

        expect(result.toString()).toBe("5229.28");
    });

    it("does not round intermediate results", () => {
        const unitPrice = 0.333;
        const quantity = 3;
        const setupFee = 0;

        const result = calculateLineItemTotal({
            unitPrice,
            quantity,
            setupFee,
        });

        expect(result.toString()).toBe("0.999");
    });

    it("rounds a half-cent upward at the output boundary", () => {
        expect(toMoneyNumber(new Decimal("10.125"))).toBe(10.13);
    });

    it("rounds values below a half-cent downward", () => {
        expect(toMoneyNumber(new Decimal("10.124"))).toBe(10.12);
    });
});