import { z } from "zod";

const ipAddressSchema = z
	.string()
	.regex(
		/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
		"Invalid IP address",
	);

export const createDeviceDto = z.object({
	name: z.string().min(2).max(100),
	type: z
		.enum(["FACE_TERMINAL", "FINGERPRINT", "CARD_READER"])
		.default("FACE_TERMINAL"),
	ipAddress: ipAddressSchema,
	port: z.number().int().min(1).max(65535).default(80),
	username: z.string().min(1).max(50).default("admin"),
	password: z.string().min(1).max(100),
	doorCount: z.number().int().min(1).max(16).default(1),
	serialNumber: z.string().optional(),
	location: z.string().max(200).optional(),
});

export const updateDeviceDto = z.object({
	name: z.string().min(2).max(100).optional(),
	type: z.enum(["FACE_TERMINAL", "FINGERPRINT", "CARD_READER"]).optional(),
	ipAddress: ipAddressSchema.optional(),
	port: z.number().int().min(1).max(65535).optional(),
	username: z.string().min(1).max(50).optional(),
	password: z.string().min(1).max(100).optional(),
	doorCount: z.number().int().min(1).max(16).optional(),
	serialNumber: z.string().nullable().optional(),
	location: z.string().max(200).nullable().optional(),
	isActive: z.boolean().optional(),
});

export const getDevicesQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	search: z.string().optional(),
	type: z.enum(["FACE_TERMINAL", "FINGERPRINT", "CARD_READER"]).optional(),
	status: z.enum(["ONLINE", "OFFLINE", "ERROR", "SYNCING"]).optional(),
	isActive: z.coerce.boolean().optional(),
});

export const syncPersonDto = z.object({
	employeeNo: z.string().min(1),
	name: z.string().min(1),
	faceImage: z.string().optional(),
});

export const syncPersonsDto = z.object({
	persons: z.array(syncPersonDto).min(1),
});

export const getEventsQueryDto = z.object({
	startTime: z.coerce.date().optional(),
	endTime: z.coerce.date().optional(),
	maxResults: z.coerce.number().int().min(1).max(1000).default(100),
});

export const uploadFaceDto = z.object({
	employeeNo: z.string().min(1),
	faceImage: z.string().min(1),
});

export const createPersonDto = z.object({
	employeeNo: z.string().min(1),
	name: z.string().min(1),
	beginTime: z.string().optional(),
	endTime: z.string().optional(),
});

export const deletePersonDto = z.object({
	employeeNo: z.string().min(1),
});

export const getDeviceLogsQueryDto = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	deviceId: z.coerce.number().int().positive().optional(),
	externalUserId: z.string().optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	isProcessed: z.coerce.boolean().optional(),
});

export type GetDeviceLogsQueryDto = z.infer<typeof getDeviceLogsQueryDto>;

export type CreateDeviceDto = z.infer<typeof createDeviceDto>;
export type UpdateDeviceDto = z.infer<typeof updateDeviceDto>;
export type GetDevicesQueryDto = z.infer<typeof getDevicesQueryDto>;
export type SyncPersonDto = z.infer<typeof syncPersonDto>;
export type SyncPersonsDto = z.infer<typeof syncPersonsDto>;
export type GetEventsQueryDto = z.infer<typeof getEventsQueryDto>;
export type UploadFaceDto = z.infer<typeof uploadFaceDto>;
export type CreatePersonDto = z.infer<typeof createPersonDto>;
export type DeletePersonDto = z.infer<typeof deletePersonDto>;
