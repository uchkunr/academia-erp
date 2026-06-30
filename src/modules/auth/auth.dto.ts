import { z } from "zod";

export const loginDto = z.object({
	username: z
		.string()
		.min(3)
		.max(50)
		.describe("Username for authentication (3-50 characters)"),
	password: z.string().min(6).describe("Password (minimum 6 characters)"),
});

const faceImageSchema = z
	.string()
	.min(1, "Face image is required")
	.refine(
		(val) => val.startsWith("data:image") || /^[A-Za-z0-9+/=]+$/.test(val),
		"Face image must be base64 or data URL (e.g. data:image/jpeg;base64,...)",
	);

export const registerDto = z.object({
	username: z
		.string()
		.min(3)
		.max(50)
		.describe("Unique username for authentication (3-50 characters)"),
	password: z
		.string()
		.min(6)
		.describe("Password (minimum 6 characters, will be hashed)"),
	fullname: z
		.string()
		.min(2)
		.max(100)
		.describe("Full name of the user (2-100 characters)"),
	phone: z
		.string()
		.optional()
		.describe("Phone number (optional, must be unique if provided)"),
	role: z
		.enum(["OWNER", "ADMIN", "CASHIER", "TEACHER"])
		.default("TEACHER")
		.describe(
			"User role: OWNER (director), ADMIN, CASHIER, or TEACHER (defaults to TEACHER)",
		),
	faceImage: faceImageSchema.describe(
		"Face image as base64 or data URL (required for Hikvision sync)",
	),
});

export type LoginDto = z.infer<typeof loginDto>;
export type RegisterDto = z.infer<typeof registerDto>;
