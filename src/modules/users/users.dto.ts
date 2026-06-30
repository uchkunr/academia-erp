import { z } from "zod";

const faceImageSchema = z
	.string()
	.min(1, "Face image is required")
	.refine(
		(val) => val.startsWith("data:image") || /^[A-Za-z0-9+/=]+$/.test(val),
		"Face image must be base64 or data URL (e.g. data:image/jpeg;base64,...)",
	);

export const createUserDto = z.object({
	username: z.string().min(3).max(50),
	password: z.string().min(6),
	fullname: z.string().min(2).max(100),
	phone: z.string().optional(),
	role: z.enum(["OWNER", "ADMIN", "CASHIER", "TEACHER"]).default("TEACHER"),
	faceImage: faceImageSchema,
});

export const updateUserDto = z.object({
	fullname: z.string().min(2).max(100).optional(),
	phone: z.string().optional(),
	role: z.enum(["OWNER", "ADMIN", "CASHIER", "TEACHER"]).optional(),
	isActive: z.boolean().optional(),
	faceImage: z
		.union([faceImageSchema, z.literal(null)])
		.optional()
		.describe(
			"Face image as base64 or data URL; send null to clear existing image",
		),
});

export const changePasswordDto = z.object({
	currentPassword: z.string().min(6),
	newPassword: z.string().min(6),
});

export const updateUserPasswordDto = z.object({
	newPassword: z.string().min(6),
});

export const getUsersQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional(),
	role: z.enum(["OWNER", "ADMIN", "CASHIER", "TEACHER"]).optional(),
	isActive: z.coerce.boolean().optional(),
});

export type CreateUserDto = z.infer<typeof createUserDto>;
export type UpdateUserDto = z.infer<typeof updateUserDto>;
export type ChangePasswordDto = z.infer<typeof changePasswordDto>;
export type UpdateUserPasswordDto = z.infer<typeof updateUserPasswordDto>;
export type GetUsersQueryDto = z.infer<typeof getUsersQueryDto>;
