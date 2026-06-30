import { describe, expect, test } from "bun:test";
import { BadRequestError } from "./http-errors";
import {
	buildDateRangeFilter,
	buildDateRangeFilterForLesson,
	calculatePagination,
	calculateTotalPages,
	groupPaymentsByMethod,
	parseId,
} from "./utils";

describe("Utils tests", () => {
	describe("parseId", () => {
		test("should successfully parse valid numeric ID", () => {
			expect(parseId("123", "test")).toBe(123);
		});

		test("should throw BadRequestError for invalid ID", () => {
			expect(() => parseId("abc", "test")).toThrow(BadRequestError);
			expect(() => parseId("abc", "test")).toThrow("Invalid test ID");
		});
	});

	describe("calculatePagination", () => {
		test("should return correct skip and take values", () => {
			const res = calculatePagination(3, 10);
			expect(res).toEqual({ skip: 20, take: 10 });
		});
	});

	describe("calculateTotalPages", () => {
		test("should calculate correct total pages", () => {
			expect(calculateTotalPages(25, 10)).toBe(3);
			expect(calculateTotalPages(0, 10)).toBe(0);
			expect(calculateTotalPages(10, 10)).toBe(1);
		});
	});

	describe("buildDateRangeFilter", () => {
		test("should return empty object if no dates are provided", () => {
			expect(buildDateRangeFilter()).toEqual({});
		});

		test("should build range query correctly", () => {
			const start = new Date("2026-01-01");
			const end = new Date("2026-01-31");
			const filter = buildDateRangeFilter(start, end, "customField");
			expect(filter).toEqual({
				customField: {
					gte: start,
					lte: end,
				},
			});
		});
	});

	describe("groupPaymentsByMethod", () => {
		test("should group payments correctly", () => {
			const payments = [
				{ method: "CASH", amount: 100 },
				{ method: "CASH", amount: 200 },
				{ method: "CARD", amount: 150 },
			];
			const res = groupPaymentsByMethod(payments);
			expect(res).toEqual([
				{ method: "CASH", amount: 300, count: 2 },
				{ method: "CARD", amount: 150, count: 1 },
			]);
		});
	});

	describe("buildDateRangeFilterForLesson", () => {
		test("should return empty object if no dates", () => {
			expect(buildDateRangeFilterForLesson()).toEqual({});
		});

		test("should build both range filters", () => {
			const start = new Date("2026-01-01");
			const end = new Date("2026-01-31");
			const filter = buildDateRangeFilterForLesson(start, end);
			expect(filter).toEqual({
				date: {
					gte: start,
					lte: end,
				},
			});
		});
	});
});
