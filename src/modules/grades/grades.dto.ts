import { z } from "zod";

export const createGradeDto = z.object({
	studentId: z.number().int().positive(),
	groupId: z.number().int().positive().optional(),
	subject: z.string().min(2).max(100).optional(),
	score: z.number().int().min(0).max(100),
	comment: z.string().max(500).optional(),
	date: z.coerce.date().optional(),
});

export const updateGradeDto = z.object({
	subject: z.string().min(2).max(100).optional(),
	score: z.number().int().min(0).max(100).optional(),
	comment: z.string().max(500).optional(),
});

export const getGradesQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	studentId: z.coerce.number().int().positive().optional(),
	groupId: z.coerce.number().int().positive().optional(),
	subject: z.string().optional(),
	minScore: z.coerce.number().int().min(0).max(100).optional(),
	maxScore: z.coerce.number().int().min(0).max(100).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
});

export type CreateGradeDto = z.infer<typeof createGradeDto>;
export type UpdateGradeDto = z.infer<typeof updateGradeDto>;
export type GetGradesQueryDto = z.infer<typeof getGradesQueryDto>;
