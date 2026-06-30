import { z } from "zod";

export const createCourseDto = z.object({
	name: z.string().min(2).max(100),
	price: z.number().positive(),
	subjectId: z.number().int().positive(),
});

export const updateCourseDto = z.object({
	name: z.string().min(2).max(100).optional(),
	price: z.number().positive().optional(),
	subjectId: z.number().int().positive().optional(),
	isActive: z.boolean().optional(),
});

export const getCoursesQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional(),
	isActive: z.coerce.boolean().optional(),
	subjectId: z.coerce.number().int().positive().optional(),
});

export type CreateCourseDto = z.infer<typeof createCourseDto>;
export type UpdateCourseDto = z.infer<typeof updateCourseDto>;
export type GetCoursesQueryDto = z.infer<typeof getCoursesQueryDto>;
