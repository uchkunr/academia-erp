import { parseId } from "@lib/utils";
import { Elysia } from "elysia";
import {
	type CreateLessonDto,
	createLessonDto,
	type GetLessonsQueryDto,
	getLessonsQueryDto,
	type UpdateLessonDto,
	updateLessonDto,
} from "./lessons.dto";
import { LessonsService } from "./lessons.service";

const lessonsService = new LessonsService();

export const lessonsController = new Elysia({ prefix: "/lessons" })
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createLessonDto.parse(body) as CreateLessonDto;
			const lesson = await lessonsService.create(validatedBody);
			set.status = 201;
			return { data: lesson };
		},
		{
			body: createLessonDto,
			detail: {
				tags: ["Lessons"],
				summary: "Create a lesson",
				description:
					"Creates a lesson (class session) for a specific group on a given date. A lesson cannot be created twice for the same group on the same date. Can mark if the lesson was held and if the teacher skipped it.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getLessonsQueryDto.parse(
				query,
			) as GetLessonsQueryDto;
			const result = await lessonsService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getLessonsQueryDto,
			detail: {
				tags: ["Lessons"],
				summary: "Get list of lessons",
				description:
					"Retrieves a paginated list of lessons with optional filtering by group, date range, whether the lesson was held, and if the teacher skipped it.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "lesson");
			const lesson = await lessonsService.findById(id);
			return { data: lesson };
		},
		{
			detail: {
				tags: ["Lessons"],
				summary: "Get lesson by ID",
				description:
					"Retrieves detailed information about a specific lesson including group details, teacher information, and attendance count.",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "lesson");
			const validatedBody = updateLessonDto.parse(body) as UpdateLessonDto;
			const lesson = await lessonsService.update(id, validatedBody);
			return { data: lesson };
		},
		{
			body: updateLessonDto,
			detail: {
				tags: ["Lessons"],
				summary: "Update lesson",
				description:
					"Updates lesson information. Can change the date, mark if the lesson was held, or if the teacher skipped it. Date conflicts are prevented.",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "lesson");
			await lessonsService.delete(id);
			return { message: "Lesson deleted successfully" };
		},
		{
			detail: {
				tags: ["Lessons"],
				summary: "Delete lesson",
				description:
					"Permanently deletes a lesson. Cannot delete lessons that have attendance records. Instead, mark the lesson as not held.",
			},
		},
	);
