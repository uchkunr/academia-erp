import { z } from "zod";

const faceImageSchema = z
	.string()
	.min(1, "Face image is required")
	.refine(
		(val) => val.startsWith("data:image") || /^[A-Za-z0-9+/=]+$/.test(val),
		"Face image must be base64 or data URL (e.g. data:image/jpeg;base64,...)",
	);

export const createStudentDto = z.object({
	fullname: z
		.string()
		.min(2)
		.max(100)
		.describe("Full name of the student (2-100 characters)"),
	phone: z
		.string()
		.optional()
		.describe("Phone number (optional, must be unique if provided)"),
	username: z
		.string()
		.min(1)
		.max(50)
		.describe("Unique username for login (1-50 characters)"),
	balance: z
		.number()
		.default(0)
		.describe("Initial account balance (defaults to 0)"),
	faceImage: faceImageSchema.describe(
		"Face image as base64 or data URL (required for Hikvision sync)",
	),
});

export const updateStudentDto = z.object({
	fullname: z
		.string()
		.min(2)
		.max(100)
		.optional()
		.describe("Full name of the student (2-100 characters)"),
	phone: z
		.string()
		.optional()
		.describe("Phone number (must be unique if provided)"),
	username: z
		.string()
		.min(1)
		.max(50)
		.optional()
		.describe("Unique username for login (1-50 characters)"),
	status: z
		.enum(["ACTIVE", "IN_DEBT", "LEFT"])
		.optional()
		.describe("Student status: ACTIVE, IN_DEBT, or LEFT"),
	balance: z.number().optional().describe("Account balance"),
	schoolClassId: z
		.number()
		.int()
		.positive()
		.nullable()
		.optional()
		.describe("ID of the school class tariff to assign to the student"),
	faceImage: z
		.union([faceImageSchema, z.literal(null)])
		.optional()
		.describe(
			"Face image as base64 or data URL; send null to clear existing image",
		),
});

export const getStudentsQueryDto = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.describe("Page number for pagination (starts from 1)"),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(10)
		.describe("Number of items per page (1-100)"),
	search: z
		.string()
		.optional()
		.describe("Search query to filter by fullname, username, or phone"),
	status: z
		.enum(["ACTIVE", "IN_DEBT", "LEFT"])
		.optional()
		.describe("Filter by student status"),
});

export const addStudentToGroupDto = z.object({
	groupId: z
		.number()
		.int()
		.positive()
		.describe("ID of the group to enroll the student in"),
	discount: z
		.number()
		.min(0)
		.default(0)
		.describe("Discount amount for this student in this group (defaults to 0)"),
});

export const updateStudentClassDto = z.object({
	classId: z
		.number()
		.int()
		.positive()
		.describe("ID of the class to assign the student to"),
});

export const createStudentAttendanceDto = z.object({
	lessonId: z
		.number()
		.int()
		.positive()
		.describe("ID of the lesson for which attendance is being recorded"),
	isPresent: z
		.boolean()
		.default(true)
		.describe("Whether the student was present (defaults to true)"),
});

export const updateStudentAttendanceDto = z.object({
	isPresent: z
		.boolean()
		.describe("Updated attendance status (true for present, false for absent)"),
});

export const createStudentPaymentDto = z.object({
	amount: z
		.number()
		.positive()
		.describe("Payment amount (must be greater than 0)"),
	discount: z
		.number()
		.min(0)
		.default(0)
		.describe("Discount amount (for display only, doesn't affect balance)"),
	method: z
		.enum(["CASH", "CARD", "CLICK"])
		.describe("Payment method: CASH, CARD, or CLICK (online payment)"),
	receivedById: z
		.number()
		.int()
		.positive()
		.describe("ID of the staff member who received the payment"),
	description: z
		.string()
		.optional()
		.describe("Optional description or notes about the payment"),
});

export const createStudentGradeDto = z.object({
	subject: z
		.string()
		.min(2)
		.max(100)
		.describe("Subject name (2-100 characters)"),
	score: z.number().int().min(0).max(100).describe("Grade score (0-100)"),
	comment: z
		.string()
		.max(500)
		.optional()
		.describe("Optional comment or feedback (max 500 characters)"),
});

export const updateStudentGradeDto = z.object({
	subject: z
		.string()
		.min(2)
		.max(100)
		.optional()
		.describe("Subject name (2-100 characters)"),
	score: z
		.number()
		.int()
		.min(0)
		.max(100)
		.optional()
		.describe("Grade score (0-100)"),
	comment: z
		.string()
		.max(500)
		.optional()
		.describe("Comment or feedback (max 500 characters)"),
});

export type CreateStudentDto = z.infer<typeof createStudentDto>;
export type UpdateStudentDto = z.infer<typeof updateStudentDto>;
export type GetStudentsQueryDto = z.infer<typeof getStudentsQueryDto>;
export type AddStudentToGroupDto = z.infer<typeof addStudentToGroupDto>;
export type UpdateStudentClassDto = z.infer<typeof updateStudentClassDto>;
export type CreateStudentAttendanceDto = z.infer<
	typeof createStudentAttendanceDto
>;
export type UpdateStudentAttendanceDto = z.infer<
	typeof updateStudentAttendanceDto
>;
export type CreateStudentPaymentDto = z.infer<typeof createStudentPaymentDto>;
export type CreateStudentGradeDto = z.infer<typeof createStudentGradeDto>;
export type UpdateStudentGradeDto = z.infer<typeof updateStudentGradeDto>;
