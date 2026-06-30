import { z } from "zod";

export const createAttendanceDto = z.object({
	lessonId: z.number().int().positive(),
	studentId: z.number().int().positive().optional(),
	userId: z.number().int().positive().optional(),
	isPresent: z.boolean().default(false),
});

export const bulkCreateAttendanceDto = z.object({
	lessonId: z.number().int().positive(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	attendances: z.array(
		z.object({
			studentId: z.number().int().positive().optional(),
			userId: z.number().int().positive().optional(),
			isPresent: z.boolean(),
		}),
	),
});

export const updateAttendanceDto = z.object({
	isPresent: z.boolean(),
});

export const getAttendancesQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	lessonId: z.coerce.number().int().positive().optional(),
	studentId: z.coerce.number().int().positive().optional(),
	userId: z.coerce.number().int().positive().optional(),
	groupId: z.coerce.number().int().positive().optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	isPresent: z
		.enum(["true", "false"])
		.transform((val) => val === "true")
		.optional(),
});

export const syncAttendanceFromDevicesDto = z.object({
	deviceId: z.coerce.number().int().positive().optional(),
	startTime: z.coerce.date().optional(),
	endTime: z.coerce.date().optional(),
	maxResults: z.coerce.number().int().min(1).max(2000).default(500),
});

export type SyncAttendanceFromDevicesDto = z.infer<
	typeof syncAttendanceFromDevicesDto
>;

export const getStaffAttendanceQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	date: z.coerce.date().optional(),
	userId: z.coerce.number().int().positive().optional(),
});

export type GetStaffAttendanceQueryDto = z.infer<
	typeof getStaffAttendanceQueryDto
>;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createStaffAttendanceDto = z
	.object({
		userId: z.number().int().positive(),
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD format"),
		checkIn: z
			.string()
			.regex(timeRegex, "checkIn must be HH:mm format (00:00-23:59)")
			.optional(),
		checkOut: z
			.string()
			.regex(timeRegex, "checkOut must be HH:mm format (00:00-23:59)")
			.optional(),
	})
	.refine(
		(data) => {
			if (data.checkOut && data.checkIn) {
				return data.checkOut > data.checkIn;
			}
			return true;
		},
		{ message: "checkOut must be greater than checkIn", path: ["checkOut"] },
	);

export type CreateStaffAttendanceDto = z.infer<typeof createStaffAttendanceDto>;
export type CreateAttendanceDto = z.infer<typeof createAttendanceDto>;
export type BulkCreateAttendanceDto = z.infer<typeof bulkCreateAttendanceDto>;
export type UpdateAttendanceDto = z.infer<typeof updateAttendanceDto>;
export type GetAttendancesQueryDto = z.infer<typeof getAttendancesQueryDto>;
