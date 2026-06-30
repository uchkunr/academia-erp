import { BadRequestError } from "@lib/http-errors";
import { parseId } from "@lib/utils";
import type {
	CreateAttendanceDto,
	UpdateAttendanceDto,
} from "@modules/attendance/attendance.dto";
import { AttendanceService } from "@modules/attendance/attendance.service";
import type {
	CreateGradeDto,
	UpdateGradeDto,
} from "@modules/grades/grades.dto";
import { GradesService } from "@modules/grades/grades.service";
import type { CreatePaymentDto } from "@modules/payments/payments.dto";
import { PaymentsService } from "@modules/payments/payments.service";
import { Elysia } from "elysia";
import {
	type AddStudentToGroupDto,
	addStudentToGroupDto,
	type CreateStudentAttendanceDto,
	type CreateStudentDto,
	type CreateStudentGradeDto,
	type CreateStudentPaymentDto,
	createStudentAttendanceDto,
	createStudentDto,
	createStudentGradeDto,
	createStudentPaymentDto,
	type GetStudentsQueryDto,
	getStudentsQueryDto,
	type UpdateStudentAttendanceDto,
	type UpdateStudentClassDto,
	type UpdateStudentDto,
	type UpdateStudentGradeDto,
	updateStudentAttendanceDto,
	updateStudentClassDto,
	updateStudentDto,
	updateStudentGradeDto,
} from "./students.dto";
import { StudentsService } from "./students.service";

const studentsService = new StudentsService();
const attendanceService = new AttendanceService();
const paymentsService = new PaymentsService();
const gradesService = new GradesService();

export const studentsController = new Elysia({ prefix: "/students" })
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createStudentDto.parse(body) as CreateStudentDto;
			const student = await studentsService.create(validatedBody);
			set.status = 201;
			return { data: student };
		},
		{
			body: createStudentDto,
			detail: {
				tags: ["Students"],
				summary: "Create a new student",
				description:
					"Creates a new student record in the system. Requires unique username and optional phone number.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getStudentsQueryDto.parse(
				query,
			) as GetStudentsQueryDto;
			const result = await studentsService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getStudentsQueryDto,
			detail: {
				tags: ["Students"],
				summary: "Get list of students",
				description:
					"Retrieves a paginated list of students with optional filtering by status and search query.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "student");
			const student = await studentsService.findById(id);
			return { data: student };
		},
		{
			detail: {
				tags: ["Students"],
				summary: "Get student by ID",
				description:
					"Retrieves detailed information about a specific student by their unique identifier.",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "student");
			const validatedBody = updateStudentDto.parse(body) as UpdateStudentDto;
			const student = await studentsService.update(id, validatedBody);
			return { data: student };
		},
		{
			body: updateStudentDto,
			detail: {
				tags: ["Students"],
				summary: "Update student information",
				description:
					"Updates student information. Only provided fields will be updated. Phone number must be unique if provided.",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "student");
			await studentsService.delete(id);
			return { message: "Student marked as left successfully" };
		},
		{
			detail: {
				tags: ["Students"],
				summary: "Mark student as left",
				description:
					"Marks a student as left (soft delete). The student record is not permanently deleted, but their status is changed to LEFT.",
			},
		},
	)
	.post(
		"/:id/sync",
		async ({ params }) => {
			const id = parseId(params.id, "student");
			const student = await studentsService.syncToDevices(id);
			return { data: student };
		},
		{
			detail: {
				tags: ["Students"],
				summary: "Sync student to all devices",
				description:
					"Re-syncs student face data to all active Hikvision face terminal devices.",
			},
		},
	)
	.post(
		"/:id/groups",
		async ({ params, body, set }) => {
			const id = parseId(params.id, "student");
			const validatedBody = addStudentToGroupDto.parse(
				body,
			) as AddStudentToGroupDto;
			const studentGroup = await studentsService.addToGroup(id, validatedBody);
			set.status = 201;
			return { data: studentGroup };
		},
		{
			body: addStudentToGroupDto,
			detail: {
				tags: ["Students", "Groups"],
				summary: "Add student to a group",
				description:
					"Enrolls a student into a specific group. Optionally applies a discount for this student in this group. The student must not already be enrolled in the group.",
			},
		},
	)
	.delete(
		"/:id/groups/:groupId",
		async ({ params }) => {
			const id = parseId(params.id, "student");
			const groupId = parseId(params.groupId, "group");
			await studentsService.removeFromGroup(id, groupId);
			return { message: "Student removed from group successfully" };
		},
		{
			detail: {
				tags: ["Students", "Groups"],
				summary: "Remove student from a group",
				description:
					"Removes a student from a specific group. The student must be currently enrolled in the group.",
			},
		},
	)
	.patch(
		"/:id/class",
		async ({ params, body }) => {
			const id = parseId(params.id, "student");
			const validatedBody = updateStudentClassDto.parse(
				body,
			) as UpdateStudentClassDto;
			const student = await studentsService.updateClass(id, validatedBody);
			return { data: student };
		},
		{
			body: updateStudentClassDto,
			detail: {
				tags: ["Students", "Classes"],
				summary: "Update student's class assignment",
				description:
					"Assigns a student to a specific class. If the student is already assigned to another class, the previous assignment will be removed automatically.",
			},
		},
	)
	.post(
		"/:id/attendance",
		async ({ params, body, set }) => {
			const id = parseId(params.id, "student");
			const validatedBody = createStudentAttendanceDto.parse(
				body,
			) as CreateStudentAttendanceDto;
			const attendanceData: CreateAttendanceDto = {
				...validatedBody,
				studentId: id,
			};
			const attendance = await attendanceService.create(attendanceData);
			set.status = 201;
			return { data: attendance };
		},
		{
			body: createStudentAttendanceDto,
			detail: {
				tags: ["Students", "Attendance"],
				summary: "Record student attendance",
				description:
					"Records attendance for a student for a specific lesson. The student ID is automatically taken from the URL parameter. Attendance cannot be recorded twice for the same lesson.",
			},
		},
	)
	.patch(
		"/:id/attendance/:attendanceId",
		async ({ params, body }) => {
			const id = parseId(params.id, "student");
			const attendanceId = parseId(params.attendanceId, "attendance");
			const attendance = await attendanceService.findById(attendanceId);
			if (attendance.studentId !== id) {
				throw new BadRequestError("Attendance does not belong to this student");
			}
			const validatedBody = updateStudentAttendanceDto.parse(
				body,
			) as UpdateStudentAttendanceDto;
			const updateData: UpdateAttendanceDto = validatedBody;
			const updatedAttendance = await attendanceService.update(
				attendanceId,
				updateData,
			);
			return { data: updatedAttendance };
		},
		{
			body: updateStudentAttendanceDto,
			detail: {
				tags: ["Students", "Attendance"],
				summary: "Update student attendance",
				description:
					"Updates the attendance status (present/absent) for a specific attendance record. The attendance must belong to the specified student.",
			},
		},
	)
	.post(
		"/:id/payments",
		async ({ params, body, set }) => {
			const id = parseId(params.id, "student");
			const validatedBody = createStudentPaymentDto.parse(
				body,
			) as CreateStudentPaymentDto;
			const paymentData: CreatePaymentDto = {
				...validatedBody,
				studentId: id,
			};
			const payment = await paymentsService.create(paymentData);
			set.status = 201;
			return { data: payment };
		},
		{
			body: createStudentPaymentDto,
			detail: {
				tags: ["Students", "Payments"],
				summary: "Create payment for student",
				description:
					"Records a payment made by a student. The student ID is automatically taken from the URL parameter. The payment amount will be added to the student's balance. Supports cash, card, and online payment methods.",
			},
		},
	)
	.post(
		"/:id/grades",
		async ({ params, body, set }) => {
			const id = parseId(params.id, "student");
			const validatedBody = createStudentGradeDto.parse(
				body,
			) as CreateStudentGradeDto;
			const gradeData: CreateGradeDto = {
				...validatedBody,
				studentId: id,
			};
			const grade = await gradesService.create(gradeData);
			set.status = 201;
			return { data: grade };
		},
		{
			body: createStudentGradeDto,
			detail: {
				tags: ["Students", "Grades"],
				summary: "Create grade for student",
				description:
					"Records a grade for a student in a specific subject. The student ID is automatically taken from the URL parameter. Score must be between 0 and 100.",
			},
		},
	)
	.patch(
		"/:id/grades/:gradeId",
		async ({ params, body }) => {
			const id = parseId(params.id, "student");
			const gradeId = parseId(params.gradeId, "grade");
			const grade = await gradesService.findById(gradeId);
			if (grade.studentId !== id) {
				throw new BadRequestError("Grade does not belong to this student");
			}
			const validatedBody = updateStudentGradeDto.parse(
				body,
			) as UpdateStudentGradeDto;
			const updateData: UpdateGradeDto = validatedBody;
			const updatedGrade = await gradesService.update(gradeId, updateData);
			return { data: updatedGrade };
		},
		{
			body: updateStudentGradeDto,
			detail: {
				tags: ["Students", "Grades"],
				summary: "Update student grade",
				description:
					"Updates a grade record for a student. Only provided fields will be updated. The grade must belong to the specified student. Score must be between 0 and 100 if provided.",
			},
		},
	);
