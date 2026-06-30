import { z } from "zod";

export const dailyRevenueQueryDto = z.object({
	date: z.coerce.date(),
});

export const monthlyRevenueQueryDto = z.object({
	year: z.coerce.number().int().min(2020).max(2100),
	month: z.coerce.number().int().min(1).max(12),
});

export const debtorsQueryDto = z.object({
	minDebt: z.coerce.number().optional().default(0),
});

export const groupProfitabilityQueryDto = z.object({
	year: z.coerce.number().int().min(2020).max(2100).optional(),
	month: z.coerce.number().int().min(1).max(12).optional(),
});

export const teacherPerformanceQueryDto = z.object({
	year: z.coerce.number().int().min(2020).max(2100).optional(),
	month: z.coerce.number().int().min(1).max(12).optional(),
	teacherId: z.coerce.number().int().positive().optional(),
});

export const centerProfitQueryDto = z.object({
	dateFrom: z.coerce.date(),
	dateTo: z.coerce.date(),
});

export type DailyRevenueQueryDto = z.infer<typeof dailyRevenueQueryDto>;
export type MonthlyRevenueQueryDto = z.infer<typeof monthlyRevenueQueryDto>;
export type DebtorsQueryDto = z.infer<typeof debtorsQueryDto>;
export type GroupProfitabilityQueryDto = z.infer<
	typeof groupProfitabilityQueryDto
>;
export type TeacherPerformanceQueryDto = z.infer<
	typeof teacherPerformanceQueryDto
>;
export type CenterProfitQueryDto = z.infer<typeof centerProfitQueryDto>;
