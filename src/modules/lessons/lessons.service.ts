import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import {
	buildDateRangeFilterForLesson,
	calculatePagination,
	calculateTotalPages,
} from "@lib/utils";

import type {
	CreateLessonDto,
	GetLessonsQueryDto,
	UpdateLessonDto,
} from "./lessons.dto";
import type { LessonListResponse, LessonWithRelations } from "./lessons.types";

export class LessonsService {
	async create(data: CreateLessonDto): Promise<LessonWithRelations> {
		const group = await prisma.group.findUnique({
			where: { id: data.groupId },
		});

		if (!group) {
			throw new NotFoundError("Group not found");
		}

		if (!group.isActive) {
			throw new BadRequestError("Group is not active");
		}

		const existingLesson = await prisma.lesson.findFirst({
			where: {
				groupId: data.groupId,
				date: data.date,
			},
		});

		if (existingLesson) {
			throw new ConflictError(
				"Lesson already exists for this group on this date",
			);
		}

		const lesson = await prisma.lesson.create({
			data: {
				groupId: data.groupId,
				date: data.date,
				wasHeld: data.wasHeld,
				teacherSkipped: data.teacherSkipped,
			},
			include: {
				group: {
					select: {
						id: true,
						name: true,
						teacher: {
							select: {
								id: true,
								fullname: true,
							},
						},
					},
				},
				_count: {
					select: {
						attendance: true,
					},
				},
			},
		});

		return lesson;
	}

	async findAll(query: GetLessonsQueryDto): Promise<LessonListResponse> {
		const { page, limit, groupId, dateFrom, dateTo, wasHeld, teacherSkipped } =
			query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(groupId && { groupId }),
			...buildDateRangeFilterForLesson(dateFrom, dateTo),
			...(wasHeld !== undefined && { wasHeld }),
			...(teacherSkipped !== undefined && { teacherSkipped }),
		};

		const [lessons, total] = await Promise.all([
			prisma.lesson.findMany({
				where,
				include: {
					group: {
						select: {
							id: true,
							name: true,
							teacher: {
								select: {
									id: true,
									fullname: true,
								},
							},
						},
					},
					_count: {
						select: {
							attendance: true,
						},
					},
				},
				orderBy: {
					date: "desc",
				},
				skip,
				take,
			}),
			prisma.lesson.count({ where }),
		]);

		return {
			lessons,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<LessonWithRelations> {
		const lesson = await prisma.lesson.findUnique({
			where: { id },
			include: {
				group: {
					select: {
						id: true,
						name: true,
						teacher: {
							select: {
								id: true,
								fullname: true,
							},
						},
					},
				},
				_count: {
					select: {
						attendance: true,
					},
				},
			},
		});

		if (!lesson) {
			throw new NotFoundError("Lesson not found");
		}

		return lesson;
	}

	async update(
		id: number,
		data: UpdateLessonDto,
	): Promise<LessonWithRelations> {
		const existingLesson = await prisma.lesson.findUnique({
			where: { id },
		});

		if (!existingLesson) {
			throw new NotFoundError("Lesson not found");
		}

		if (data.date) {
			const dateConflict = await prisma.lesson.findFirst({
				where: {
					groupId: existingLesson.groupId,
					date: data.date,
					id: { not: id },
				},
			});

			if (dateConflict) {
				throw new ConflictError(
					"Lesson already exists for this group on this date",
				);
			}
		}

		const lesson = await prisma.lesson.update({
			where: { id },
			data,
			include: {
				group: {
					select: {
						id: true,
						name: true,
						teacher: {
							select: {
								id: true,
								fullname: true,
							},
						},
					},
				},
				_count: {
					select: {
						attendance: true,
					},
				},
			},
		});

		return lesson;
	}

	async delete(id: number): Promise<void> {
		const lesson = await prisma.lesson.findUnique({
			where: { id },
			include: {
				_count: {
					select: {
						attendance: true,
					},
				},
			},
		});

		if (!lesson) {
			throw new NotFoundError("Lesson not found");
		}

		if (lesson._count.attendance > 0) {
			throw new BadRequestError(
				"Cannot delete lesson with attendance records. Mark as not held instead.",
			);
		}

		await prisma.lesson.delete({
			where: { id },
		});
	}
}
