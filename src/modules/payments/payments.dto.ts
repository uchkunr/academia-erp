import { z } from "zod";

export const createPaymentDto = z.object({
	studentId: z.number().int().positive(),
	groupId: z.number().int().positive().optional(),
	amount: z.number().positive().optional(),
	discount: z.number().min(0).default(0),
	method: z.enum(["CASH", "CARD", "CLICK"]),
	receivedById: z.number().int().positive(),
	description: z.string().optional(),
	periodStart: z.coerce.date().optional(),
	periodEnd: z.coerce.date().optional(),
});

export const getPaymentsQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	studentId: z.coerce.number().int().positive().optional(),
	groupId: z.coerce.number().int().positive().optional(),
	method: z.enum(["CASH", "CARD", "CLICK"]).optional(),
	status: z.enum(["PAID", "PARTIAL", "DEBT", "CANCELLED"]).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
});

export const cancelPaymentDto = z.object({
	userId: z
		.number()
		.int()
		.positive()
		.describe("ID of the user who is cancelling the payment (for audit trail)"),
});

export const createSubjectDto = z.object({
	name: z.string().min(2).max(100),
});

export const updateSubjectDto = z.object({
	name: z.string().min(2).max(100).optional(),
	isActive: z.boolean().optional(),
});

export const getSubjectsQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional(),
	isActive: z.coerce.boolean().optional(),
});

export const createPricingTariffDto = z.object({
	studentClass: z.enum([
		"GRADES_1_4",
		"GRADES_5_7",
		"GRADES_8_9",
		"GRADE_10",
		"GRADE_11",
		"CERTIFICATE",
	]),
	teacherLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]),
	amount: z.number().positive(),
	subjectId: z.number().int().positive().optional(),
	validFrom: z.coerce.date().optional(),
	validTo: z.coerce.date().nullable().optional(),
});

export const updatePricingTariffDto = z.object({
	studentClass: z
		.enum([
			"GRADES_1_4",
			"GRADES_5_7",
			"GRADES_8_9",
			"GRADE_10",
			"GRADE_11",
			"CERTIFICATE",
		])
		.optional(),
	teacherLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]).optional(),
	amount: z.number().positive().optional(),
	subjectId: z.number().int().positive().nullable().optional(),
	validFrom: z.coerce.date().optional(),
	validTo: z.coerce.date().nullable().optional(),
});

export const getPricingTariffsQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	studentClass: z
		.enum([
			"GRADES_1_4",
			"GRADES_5_7",
			"GRADES_8_9",
			"GRADE_10",
			"GRADE_11",
			"CERTIFICATE",
		])
		.optional(),
	teacherLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]).optional(),
	subjectId: z.coerce.number().int().positive().optional(),
});

export const createTeacherSubjectLevelDto = z.object({
	teacherId: z.number().int().positive(),
	subjectId: z.number().int().positive(),
	level: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]),
});

export const updateTeacherSubjectLevelDto = z.object({
	level: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]).optional(),
});

export const getTeacherSubjectLevelsQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	teacherId: z.coerce.number().int().positive().optional(),
	subjectId: z.coerce.number().int().positive().optional(),
	level: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]).optional(),
});

export type CreatePaymentDto = z.infer<typeof createPaymentDto>;
export type GetPaymentsQueryDto = z.infer<typeof getPaymentsQueryDto>;
export type CancelPaymentDto = z.infer<typeof cancelPaymentDto>;
export type CreateSubjectDto = z.infer<typeof createSubjectDto>;
export type UpdateSubjectDto = z.infer<typeof updateSubjectDto>;
export type GetSubjectsQueryDto = z.infer<typeof getSubjectsQueryDto>;
export type CreatePricingTariffDto = z.infer<typeof createPricingTariffDto>;
export type UpdatePricingTariffDto = z.infer<typeof updatePricingTariffDto>;
export type GetPricingTariffsQueryDto = z.infer<
	typeof getPricingTariffsQueryDto
>;
export type CreateTeacherSubjectLevelDto = z.infer<
	typeof createTeacherSubjectLevelDto
>;
export type UpdateTeacherSubjectLevelDto = z.infer<
	typeof updateTeacherSubjectLevelDto
>;
export type GetTeacherSubjectLevelsQueryDto = z.infer<
	typeof getTeacherSubjectLevelsQueryDto
>;

export const createSchoolClassDto = z.object({
	name: z.string().min(2).max(100),
	price: z.number().positive(),
	teacherShareL1: z.number().min(0),
	teacherShareL2: z.number().min(0),
	teacherShareL3: z.number().min(0),
	teacherShareL4: z.number().min(0),
});

export const updateSchoolClassDto = z.object({
	name: z.string().min(2).max(100).optional(),
	price: z.number().positive().optional(),
	teacherShareL1: z.number().min(0).optional(),
	teacherShareL2: z.number().min(0).optional(),
	teacherShareL3: z.number().min(0).optional(),
	teacherShareL4: z.number().min(0).optional(),
	isActive: z.boolean().optional(),
});

export const getSchoolClassesQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional(),
	isActive: z.coerce.boolean().optional(),
});

export const studentSummaryQueryDto = z.object({
	studentId: z.coerce.number().int().positive(),
	groupId: z.coerce.number().int().positive().optional(),
	year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export type StudentSummaryQueryDto = z.infer<typeof studentSummaryQueryDto>;
export type CreateSchoolClassDto = z.infer<typeof createSchoolClassDto>;
export type UpdateSchoolClassDto = z.infer<typeof updateSchoolClassDto>;
export type GetSchoolClassesQueryDto = z.infer<typeof getSchoolClassesQueryDto>;
