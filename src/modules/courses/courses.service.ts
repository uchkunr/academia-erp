import { ConflictError, NotFoundError } from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import { calculatePagination, calculateTotalPages } from "@lib/utils";

import type {
	CreateCourseDto,
	GetCoursesQueryDto,
	UpdateCourseDto,
} from "./courses.dto";
import type { Course, CourseListResponse } from "./courses.types";

export class CoursesService {
	async create(data: CreateCourseDto): Promise<Course> {
		const existingCourse = await prisma.course.findFirst({
			where: { name: data.name },
		});

		if (existingCourse) {
			throw new ConflictError("Course with this name already exists");
		}

		const subject = await prisma.subject.findUnique({
			where: { id: data.subjectId },
		});

		if (!subject) {
			throw new NotFoundError("Subject not found");
		}

		const course = await prisma.course.create({
			data: {
				name: data.name,
				price: data.price,
				subjectId: data.subjectId,
			},
			select: {
				id: true,
				name: true,
				price: true,
				subjectId: true,
				isActive: true,
			},
		});

		return course;
	}

	async findAll(query: GetCoursesQueryDto): Promise<CourseListResponse> {
		const { page, limit, search, isActive, subjectId } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(search && {
				name: { contains: search, mode: "insensitive" as const },
			}),
			...(isActive !== undefined && { isActive }),
			...(subjectId !== undefined && { subjectId }),
		};

		const [courses, total] = await Promise.all([
			prisma.course.findMany({
				where,
				select: {
					id: true,
					name: true,
					price: true,
					subjectId: true,
					isActive: true,
				},
				orderBy: {
					name: "asc",
				},
				skip,
				take,
			}),
			prisma.course.count({ where }),
		]);

		return {
			courses,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<Course> {
		const course = await prisma.course.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				price: true,
				subjectId: true,
				isActive: true,
			},
		});

		if (!course) {
			throw new NotFoundError("Course not found");
		}

		return course;
	}

	async update(id: number, data: UpdateCourseDto): Promise<Course> {
		const existingCourse = await prisma.course.findUnique({
			where: { id },
		});

		if (!existingCourse) {
			throw new NotFoundError("Course not found");
		}

		if (data.name) {
			const nameExists = await prisma.course.findFirst({
				where: {
					name: data.name,
					id: { not: id },
				},
			});

			if (nameExists) {
				throw new ConflictError("Course with this name already exists");
			}
		}

		if (data.subjectId) {
			const subject = await prisma.subject.findUnique({
				where: { id: data.subjectId },
			});

			if (!subject) {
				throw new NotFoundError("Subject not found");
			}
		}

		const course = await prisma.course.update({
			where: { id },
			data,
			select: {
				id: true,
				name: true,
				price: true,
				subjectId: true,
				isActive: true,
			},
		});

		return course;
	}

	async delete(id: number): Promise<void> {
		const course = await prisma.course.findUnique({
			where: { id },
		});

		if (!course) {
			throw new NotFoundError("Course not found");
		}

		await prisma.course.update({
			where: { id },
			data: { isActive: false },
		});
	}
}
