import { parseId } from "@lib/utils";
import { Elysia } from "elysia";
import {
	type CreateGradeDto,
	createGradeDto,
	type GetGradesQueryDto,
	getGradesQueryDto,
	type UpdateGradeDto,
	updateGradeDto,
} from "./grades.dto";
import { GradesService } from "./grades.service";

const gradesService = new GradesService();

export const gradesController = new Elysia({ prefix: "/grades" })
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createGradeDto.parse(body) as CreateGradeDto;
			const grade = await gradesService.create(validatedBody);
			set.status = 201;
			return { data: grade };
		},
		{
			body: createGradeDto,
			detail: {
				tags: ["Grades"],
				summary: "Create a grade record",
				description:
					"Records a grade for a student in a specific subject. Score must be between 0 and 100. Optionally includes a comment or feedback.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getGradesQueryDto.parse(
				query,
			) as GetGradesQueryDto;
			const result = await gradesService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getGradesQueryDto,
			detail: {
				tags: ["Grades"],
				summary: "Get list of grades",
				description:
					"Retrieves a paginated list of grades with optional filtering by student, subject, score range, and date range.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "grade");
			const grade = await gradesService.findById(id);
			return { data: grade };
		},
		{
			detail: {
				tags: ["Grades"],
				summary: "Get grade by ID",
				description:
					"Retrieves detailed information about a specific grade record including student details.",
			},
		},
	)
	.get(
		"/student/:studentId/stats",
		async ({ params }) => {
			const studentId = parseId(params.studentId, "student");
			const stats = await gradesService.getStudentStats(studentId);
			return { data: stats };
		},
		{
			detail: {
				tags: ["Grades"],
				summary: "Get student grade statistics",
				description:
					"Retrieves comprehensive grade statistics for a specific student including average score, total grades, grades by subject, and performance trends.",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "grade");
			const validatedBody = updateGradeDto.parse(body) as UpdateGradeDto;
			const grade = await gradesService.update(id, validatedBody);
			return { data: grade };
		},
		{
			body: updateGradeDto,
			detail: {
				tags: ["Grades"],
				summary: "Update grade record",
				description:
					"Updates a grade record. Only provided fields will be updated. Score must be between 0 and 100 if provided.",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "grade");
			await gradesService.delete(id);
			return { message: "Grade deleted successfully" };
		},
		{
			detail: {
				tags: ["Grades"],
				summary: "Delete grade record",
				description:
					"Permanently deletes a grade record. Use with caution as this action cannot be undone.",
			},
		},
	);
