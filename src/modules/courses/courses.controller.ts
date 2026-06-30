import { parseId } from "@lib/utils";
import { Elysia } from "elysia";
import {
	type CreateCourseDto,
	createCourseDto,
	type GetCoursesQueryDto,
	getCoursesQueryDto,
	type UpdateCourseDto,
	updateCourseDto,
} from "./courses.dto";
import { CoursesService } from "./courses.service";

const coursesService = new CoursesService();

export const coursesController = new Elysia({ prefix: "/courses" })
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createCourseDto.parse(body) as CreateCourseDto;
			const course = await coursesService.create(validatedBody);
			set.status = 201;
			return { data: course };
		},
		{
			body: createCourseDto,
			detail: {
				tags: ["Courses"],
				summary: "Create a new course",
				description:
					"Creates a new course in the catalog. The course price represents the standard market price that students pay. This price is separate from the teacher rate in groups.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getCoursesQueryDto.parse(
				query,
			) as GetCoursesQueryDto;
			const result = await coursesService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getCoursesQueryDto,
			detail: {
				tags: ["Courses"],
				summary: "Get list of courses",
				description:
					"Retrieves a paginated list of courses with optional filtering by search query, active status, and subject.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "course");
			const course = await coursesService.findById(id);
			return { data: course };
		},
		{
			detail: {
				tags: ["Courses"],
				summary: "Get course by ID",
				description:
					"Retrieves detailed information about a specific course including its price and active status.",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "course");
			const validatedBody = updateCourseDto.parse(body) as UpdateCourseDto;
			const course = await coursesService.update(id, validatedBody);
			return { data: course };
		},
		{
			body: updateCourseDto,
			detail: {
				tags: ["Courses"],
				summary: "Update course information",
				description:
					"Updates course information. Only provided fields will be updated. Course name must be unique if changed.",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "course");
			await coursesService.delete(id);
			return { message: "Course deactivated successfully" };
		},
		{
			detail: {
				tags: ["Courses"],
				summary: "Deactivate course",
				description:
					"Deactivates a course (soft delete). The course record is not permanently deleted, but marked as inactive. Existing groups using this course remain active, but new groups cannot be created with this course.",
			},
		},
	);
