import { z } from "zod";

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const parseTimeToMinutes = (s: string): number => {
	const [h, m] = s.split(":").map(Number);
	return h * 60 + m;
};

const scheduleSchema = z
	.object({
		days: z.array(z.number().int().min(0).max(6)),
		time: z.string().regex(timeRegex).optional(),
		startTime: z
			.string()
			.regex(timeRegex)
			.describe("Lesson start time (HH:mm)"),
		endTime: z.string().regex(timeRegex).describe("Lesson end time (HH:mm)"),
	})
	.refine(
		(data) =>
			parseTimeToMinutes(data.endTime) > parseTimeToMinutes(data.startTime),
		{ message: "endTime must be after startTime", path: ["endTime"] },
	);

export const createGroupDto = z.object({
	name: z.string().min(2).max(100),
	courseId: z.number().int().positive(),
	teacherId: z.number().int().positive(),
	teacherRate: z.number().positive().optional(),
	schedule: scheduleSchema,
	roomNumber: z.string().optional(),
	paymentDay: z.number().int().min(1).max(31).optional(),
});

export const updateGroupDto = z.object({
	name: z.string().min(2).max(100).optional(),
	courseId: z.number().int().positive().optional(),
	teacherId: z.number().int().positive().optional(),
	teacherRate: z.number().positive().optional(),
	schedule: scheduleSchema.optional(),
	roomNumber: z.string().optional(),
	paymentDay: z.number().int().min(1).max(31).nullable().optional(),
	isActive: z.boolean().optional(),
});

export const getGroupsQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional(),
	courseId: z.coerce.number().int().positive().optional(),
	teacherId: z.coerce.number().int().positive().optional(),
	isActive: z.coerce.boolean().optional(),
});

export type CreateGroupDto = z.infer<typeof createGroupDto>;
export type UpdateGroupDto = z.infer<typeof updateGroupDto>;
export type GetGroupsQueryDto = z.infer<typeof getGroupsQueryDto>;
