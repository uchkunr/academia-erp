import { BadRequestError, NotFoundError } from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import { calculatePagination, calculateTotalPages } from "@lib/utils";

import type {
	CreateGroupDto,
	GetGroupsQueryDto,
	UpdateGroupDto,
} from "./groups.dto";
import type {
	GroupListResponse,
	GroupWithRelations,
	GroupWithStudents,
} from "./groups.types";

export class GroupsService {
	async create(data: CreateGroupDto): Promise<GroupWithRelations> {
		const course = await prisma.course.findUnique({
			where: { id: data.courseId },
		});

		if (!course) {
			throw new NotFoundError("Course not found");
		}

		if (!course.isActive) {
			throw new BadRequestError("Course is not active");
		}

		const teacher = await prisma.user.findUnique({
			where: { id: data.teacherId },
		});

		if (!teacher) {
			throw new NotFoundError("Teacher not found");
		}

		if (!teacher.isActive) {
			throw new BadRequestError("Teacher is not active");
		}

		if (teacher.role !== "TEACHER" && teacher.role !== "ADMIN") {
			throw new BadRequestError("User is not a teacher");
		}

		if (course.subjectId) {
			const teacherSubjectLevel = await prisma.teacherSubjectLevel.findUnique({
				where: {
					teacherId_subjectId: {
						teacherId: data.teacherId,
						subjectId: course.subjectId,
					},
				},
			});

			if (!teacherSubjectLevel) {
				throw new BadRequestError(
					"This subject is not assigned to this teacher. First, assign the subject level to the teacher.",
				);
			}
		}

		const group = await prisma.group.create({
			data: {
				name: data.name,
				courseId: data.courseId,
				teacherId: data.teacherId,
				teacherRate: data.teacherRate ?? null,
				schedule: data.schedule,
				roomNumber: data.roomNumber,
				paymentDay: data.paymentDay,
			},
			include: {
				course: {
					select: {
						id: true,
						name: true,
						price: true,
					},
				},
				teacher: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				_count: {
					select: {
						students: true,
					},
				},
			},
		});

		return group as GroupWithRelations;
	}

	async findAll(query: GetGroupsQueryDto): Promise<GroupListResponse> {
		const { page, limit, search, courseId, teacherId, isActive } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(search && {
				name: { contains: search, mode: "insensitive" as const },
			}),
			...(courseId && { courseId }),
			...(teacherId && { teacherId }),
			...(isActive !== undefined && { isActive }),
		};

		const [groups, total] = await Promise.all([
			prisma.group.findMany({
				where,
				include: {
					course: {
						select: {
							id: true,
							name: true,
							price: true,
						},
					},
					teacher: {
						select: {
							id: true,
							fullname: true,
							username: true,
						},
					},
					_count: {
						select: {
							students: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
				skip,
				take,
			}),
			prisma.group.count({ where }),
		]);

		return {
			groups: groups as GroupWithRelations[],
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<GroupWithStudents> {
		const group = await prisma.group.findUnique({
			where: { id },
			include: {
				course: {
					select: {
						id: true,
						name: true,
						price: true,
					},
				},
				teacher: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				students: {
					select: {
						id: true,
						studentId: true,
						discount: true,
						joinedAt: true,
						student: {
							select: {
								id: true,
								fullname: true,
								username: true,
								phone: true,
							},
						},
					},
				},
				_count: {
					select: {
						students: true,
					},
				},
			},
		});

		if (!group) {
			throw new NotFoundError("Group not found");
		}

		return group as GroupWithStudents;
	}

	async update(id: number, data: UpdateGroupDto): Promise<GroupWithRelations> {
		const existingGroup = await prisma.group.findUnique({
			where: { id },
			include: { course: { select: { subjectId: true } } },
		});

		if (!existingGroup) {
			throw new NotFoundError("Group not found");
		}

		let newSubjectId = existingGroup.course.subjectId;

		if (data.courseId) {
			const course = await prisma.course.findUnique({
				where: { id: data.courseId },
			});

			if (!course) {
				throw new BadRequestError("Course not found");
			}

			if (!course.isActive) {
				throw new BadRequestError("Course is not active");
			}

			newSubjectId = course.subjectId;
		}

		if (data.teacherId) {
			const teacher = await prisma.user.findUnique({
				where: { id: data.teacherId },
			});

			if (!teacher) {
				throw new BadRequestError("Teacher not found");
			}

			if (!teacher.isActive) {
				throw new BadRequestError("Teacher is not active");
			}

			if (teacher.role !== "TEACHER" && teacher.role !== "ADMIN") {
				throw new BadRequestError("User is not a teacher");
			}
		}

		const effectiveTeacherId = data.teacherId ?? existingGroup.teacherId;
		if (newSubjectId) {
			const teacherSubjectLevel = await prisma.teacherSubjectLevel.findUnique({
				where: {
					teacherId_subjectId: {
						teacherId: effectiveTeacherId,
						subjectId: newSubjectId,
					},
				},
			});

			if (!teacherSubjectLevel) {
				throw new BadRequestError(
					"This subject is not assigned to this teacher. First, assign the subject level to the teacher.",
				);
			}
		}

		const group = await prisma.group.update({
			where: { id },
			data,
			include: {
				course: {
					select: {
						id: true,
						name: true,
						price: true,
					},
				},
				teacher: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				_count: {
					select: {
						students: true,
					},
				},
			},
		});

		return group as GroupWithRelations;
	}

	async delete(id: number): Promise<void> {
		const group = await prisma.group.findUnique({
			where: { id },
		});

		if (!group) {
			throw new NotFoundError("Group not found");
		}

		await prisma.group.update({
			where: { id },
			data: { isActive: false },
		});
	}
}
