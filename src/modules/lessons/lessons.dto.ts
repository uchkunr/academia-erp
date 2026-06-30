import { z } from "zod";

export const createLessonDto = z.object({
	groupId: z.number().int().positive(),
	date: z.coerce.date(),
	wasHeld: z.boolean().default(true),
	teacherSkipped: z.boolean().default(false),
});

export const updateLessonDto = z.object({
	date: z.coerce.date().optional(),
	wasHeld: z.boolean().optional(),
	teacherSkipped: z.boolean().optional(),
});

export const getLessonsQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	groupId: z.coerce.number().int().positive().optional(),
	dateFrom: z.coerce.date().optional(),
	dateTo: z.coerce.date().optional(),
	wasHeld: z.coerce.boolean().optional(),
	teacherSkipped: z.coerce.boolean().optional(),
});

export type CreateLessonDto = z.infer<typeof createLessonDto>;
export type UpdateLessonDto = z.infer<typeof updateLessonDto>;
export type GetLessonsQueryDto = z.infer<typeof getLessonsQueryDto>;
