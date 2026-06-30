import { ForbiddenError } from "@lib/http-errors";
import { parseId } from "@lib/utils";
import { DevicesService } from "@modules/devices/devices.service";
import { Elysia } from "elysia";
import {
	type BulkCreateAttendanceDto,
	bulkCreateAttendanceDto,
	type CreateAttendanceDto,
	type CreateStaffAttendanceDto,
	createAttendanceDto,
	createStaffAttendanceDto,
	type GetAttendancesQueryDto,
	type GetStaffAttendanceQueryDto,
	getAttendancesQueryDto,
	getStaffAttendanceQueryDto,
	type SyncAttendanceFromDevicesDto,
	syncAttendanceFromDevicesDto,
	type UpdateAttendanceDto,
	updateAttendanceDto,
} from "./attendance.dto";
import { AttendanceService } from "./attendance.service";

const attendanceService = new AttendanceService();
const devicesService = new DevicesService();

export const attendanceController = new Elysia({ prefix: "/attendance" })
	.post(
		"/sync-from-devices",
		async ({ body }) => {
			const validated = syncAttendanceFromDevicesDto.parse(
				body,
			) as SyncAttendanceFromDevicesDto;
			const fetchResult = await devicesService.fetchAndStoreEvents({
				deviceId: validated.deviceId,
				startTime: validated.startTime,
				endTime: validated.endTime,
				maxResults: validated.maxResults,
			});
			const processResult =
				await attendanceService.processDeviceLogsToAttendance();
			return {
				data: {
					deviceLogsCreated: fetchResult.deviceLogsCreated,
					eventsProcessed: processResult.processed,
					attendancesCreated: processResult.attendancesCreated,
					errors: fetchResult.errors,
				},
			};
		},
		{
			body: syncAttendanceFromDevicesDto,
			detail: {
				tags: ["Attendance"],
				summary: "Sync attendance from Hikvision devices",
				description:
					"Fetches access events from Hikvision device(s), saves them to the database, and creates attendance records for matching lessons. Returns counts and any errors.",
			},
		},
	)
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createAttendanceDto.parse(
				body,
			) as CreateAttendanceDto;
			const attendance = await attendanceService.create(validatedBody);
			set.status = 201;
			return { data: attendance };
		},
		{
			body: createAttendanceDto,
			detail: {
				tags: ["Attendance"],
				summary: "Record attendance",
				description:
					"Records attendance for a student or staff member for a specific lesson. Either studentId or userId must be provided, but not both. Attendance cannot be recorded twice for the same lesson.",
			},
		},
	)
	.post(
		"/bulk",
		async ({ body, set }) => {
			const validatedBody = bulkCreateAttendanceDto.parse(
				body,
			) as BulkCreateAttendanceDto;
			const attendances = await attendanceService.bulkCreate(validatedBody);
			set.status = 201;
			return { data: attendances };
		},
		{
			body: bulkCreateAttendanceDto,
			detail: {
				tags: ["Attendance"],
				summary: "Bulk create attendance records",
				description:
					"Creates multiple attendance records for a single lesson in one request. Useful for recording attendance for all students in a group at once.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getAttendancesQueryDto.parse(
				query,
			) as GetAttendancesQueryDto;
			const result = await attendanceService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getAttendancesQueryDto,
			detail: {
				tags: ["Attendance"],
				summary: "Get list of attendance records",
				description:
					"Retrieves a paginated list of attendance records with optional filtering by lesson, student, user, group, date range, and presence status.",
			},
		},
	)
	.post(
		"/staff",
		// @ts-expect-error user is injected by authMacro
		async ({ body, user, set }) => {
			if (user.role !== "OWNER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only OWNER and ADMIN can manage staff attendance",
				);
			}
			const validatedBody = createStaffAttendanceDto.parse(
				body,
			) as CreateStaffAttendanceDto;
			const { record, isNew } =
				await attendanceService.createStaffAttendance(validatedBody);
			set.status = isNew ? 201 : 200;
			return { data: record };
		},
		{
			body: createStaffAttendanceDto,
			detail: {
				tags: ["Attendance"],
				summary: "Create or update staff attendance",
				description:
					"Manually records check-in/check-out times for a staff member. If a record already exists for the same user and date, it will be updated. Only OWNER and ADMIN roles can use this endpoint.",
			},
		},
	)
	.get(
		"/staff",
		async ({ query }) => {
			const validatedQuery = getStaffAttendanceQueryDto.parse(
				query,
			) as GetStaffAttendanceQueryDto;
			const result = await attendanceService.getStaffAttendance(validatedQuery);
			return { data: result };
		},
		{
			query: getStaffAttendanceQueryDto,
			detail: {
				tags: ["Attendance"],
				summary: "Get staff attendance (check-in/check-out)",
				description:
					"Retrieves staff check-in and check-out times based on device logs. Groups logs by user per day, showing first log as check-in and last as check-out.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "attendance");
			const attendance = await attendanceService.findById(id);
			return { data: attendance };
		},
		{
			detail: {
				tags: ["Attendance"],
				summary: "Get attendance record by ID",
				description:
					"Retrieves detailed information about a specific attendance record including lesson details and student/user information.",
			},
		},
	)
	.get(
		"/lesson/:lessonId/stats",
		async ({ params }) => {
			const lessonId = parseId(params.lessonId, "lesson");
			const stats = await attendanceService.getLessonStats(lessonId);
			return { data: stats };
		},
		{
			detail: {
				tags: ["Attendance"],
				summary: "Get lesson attendance statistics",
				description:
					"Retrieves attendance statistics for a specific lesson including total students, present count, absent count, and attendance rate percentage.",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "attendance");
			const validatedBody = updateAttendanceDto.parse(
				body,
			) as UpdateAttendanceDto;
			const attendance = await attendanceService.update(id, validatedBody);
			return { data: attendance };
		},
		{
			body: updateAttendanceDto,
			detail: {
				tags: ["Attendance"],
				summary: "Update attendance record",
				description:
					"Updates the attendance status (present/absent) for a specific attendance record.",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "attendance");
			await attendanceService.delete(id);
			return { message: "Attendance deleted successfully" };
		},
		{
			detail: {
				tags: ["Attendance"],
				summary: "Delete attendance record",
				description:
					"Permanently deletes an attendance record. Use with caution as this action cannot be undone.",
			},
		},
	);
