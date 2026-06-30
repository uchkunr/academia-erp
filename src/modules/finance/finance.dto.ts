import { z } from "zod";

export const createCashHandoverDto = z.object({
	amount: z.number().positive(),
	note: z.string().max(500).optional(),
});

export const getCashHandoversQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
	fromUserId: z.coerce.number().int().positive().optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
});

export const createTeacherPaymentDto = z.object({
	teacherId: z.number().int().positive(),
	amount: z.number().positive(),
	type: z.enum(["SALARY", "ADVANCE"]),
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM format")
		.optional(),
	description: z.string().max(500).optional(),
});

export const getTeacherPaymentsQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	teacherId: z.coerce.number().int().positive().optional(),
	type: z.enum(["SALARY", "ADVANCE"]).optional(),
	month: z.string().optional(),
});

export const teacherSalaryQueryDto = z.object({
	year: z.coerce.number().int().min(2020).max(2100),
	month: z.coerce.number().int().min(1).max(12),
});

export type CreateCashHandoverDto = z.infer<typeof createCashHandoverDto>;
export type GetCashHandoversQueryDto = z.infer<typeof getCashHandoversQueryDto>;
export type CreateTeacherPaymentDto = z.infer<typeof createTeacherPaymentDto>;
export type GetTeacherPaymentsQueryDto = z.infer<
	typeof getTeacherPaymentsQueryDto
>;
export type TeacherSalaryQueryDto = z.infer<typeof teacherSalaryQueryDto>;
