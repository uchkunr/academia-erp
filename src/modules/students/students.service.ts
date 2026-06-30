import { syncPersonToAllDevices } from "@lib/hikvision-sync";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import { calculatePagination, calculateTotalPages } from "@lib/utils";

import type {
	AddStudentToGroupDto,
	CreateStudentDto,
	GetStudentsQueryDto,
	UpdateStudentClassDto,
	UpdateStudentDto,
} from "./students.dto";
import type { Student, StudentListResponse } from "./students.types";

export class StudentsService {
	private readonly studentSelect = {
		id: true,
		fullname: true,
		phone: true,
		username: true,
		status: true,
		balance: true,
		studentClass: true,
		externalId: true,
		syncedToDevice: true,
		schoolClass: {
			select: {
				id: true,
				name: true,
				price: true,
			},
		},
		groups: {
			select: {
				id: true,
				groupId: true,
				discount: true,
				joinedAt: true,
				group: {
					select: {
						id: true,
						name: true,
						course: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		},
		createdAt: true,
		updatedAt: true,
	};

	async create(data: CreateStudentDto): Promise<Student> {
		const existingStudent = await prisma.student.findUnique({
			where: { username: data.username },
		});

		if (existingStudent) {
			throw new ConflictError("Username already exists");
		}

		if (data.phone) {
			const existingPhone = await prisma.student.findFirst({
				where: { phone: data.phone },
			});

			if (existingPhone) {
				throw new ConflictError("Phone number already exists");
			}
		}

		const student = await prisma.student.create({
			data: {
				fullname: data.fullname,
				phone: data.phone,
				username: data.username,
				balance: data.balance,
				faceImage: data.faceImage,
			},
			select: { id: true, fullname: true },
		});

		const externalId = `S${student.id}`;
		await prisma.student.update({
			where: { id: student.id },
			data: { externalId },
		});

		const syncResult = await syncPersonToAllDevices(
			externalId,
			student.fullname,
			data.faceImage,
		);
		await prisma.student.update({
			where: { id: student.id },
			data: { syncedToDevice: syncResult.synced > 0 },
		});

		const created = await prisma.student.findUnique({
			where: { id: student.id },
			select: this.studentSelect,
		});
		return created as Student;
	}

	async findAll(query: GetStudentsQueryDto): Promise<StudentListResponse> {
		const { page, limit, search, status } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(search && {
				OR: [
					{ fullname: { contains: search, mode: "insensitive" as const } },
					{ username: { contains: search, mode: "insensitive" as const } },
					{ phone: { contains: search, mode: "insensitive" as const } },
				],
			}),
			...(status && { status }),
		};

		const [students, total] = await Promise.all([
			prisma.student.findMany({
				where,
				select: this.studentSelect,
				orderBy: {
					createdAt: "desc",
				},
				skip,
				take,
			}),
			prisma.student.count({ where }),
		]);

		return {
			students: students as Student[],
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<Student> {
		const student = await prisma.student.findUnique({
			where: { id },
			select: this.studentSelect,
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		return student as Student;
	}

	async update(id: number, data: UpdateStudentDto): Promise<Student> {
		const existingStudent = await prisma.student.findUnique({
			where: { id },
		});

		if (!existingStudent) {
			throw new NotFoundError("Student not found");
		}

		if (data.username) {
			const usernameExists = await prisma.student.findFirst({
				where: {
					username: data.username,
					id: { not: id },
				},
			});

			if (usernameExists) {
				throw new ConflictError("Username already exists");
			}
		}

		if (data.phone) {
			const phoneExists = await prisma.student.findFirst({
				where: {
					phone: data.phone,
					id: { not: id },
				},
			});

			if (phoneExists) {
				throw new ConflictError("Phone number already exists");
			}
		}

		await prisma.student.update({
			where: { id },
			data,
		});

		const needsSync =
			(data.faceImage !== undefined && data.faceImage !== null) ||
			data.fullname !== undefined;

		if (needsSync && existingStudent.externalId) {
			const updatedName = data.fullname || existingStudent.fullname;
			const faceImage = data.faceImage || existingStudent.faceImage;

			if (faceImage) {
				const syncResult = await syncPersonToAllDevices(
					existingStudent.externalId,
					updatedName,
					faceImage,
				);
				await prisma.student.update({
					where: { id },
					data: { syncedToDevice: syncResult.synced > 0 },
				});
			}
		}

		const updated = await prisma.student.findUnique({
			where: { id },
			select: this.studentSelect,
		});
		return updated as Student;
	}

	async syncToDevices(id: number): Promise<Student> {
		const student = await prisma.student.findUnique({
			where: { id },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		if (!student.faceImage) {
			throw new BadRequestError("Student has no face image");
		}

		const externalId = student.externalId || `S${student.id}`;
		if (!student.externalId) {
			await prisma.student.update({
				where: { id },
				data: { externalId },
			});
		}

		const syncResult = await syncPersonToAllDevices(
			externalId,
			student.fullname,
			student.faceImage,
		);

		await prisma.student.update({
			where: { id },
			data: { syncedToDevice: syncResult.synced > 0 },
		});

		const updated = await prisma.student.findUnique({
			where: { id },
			select: this.studentSelect,
		});
		return updated as Student;
	}

	async delete(id: number): Promise<void> {
		const student = await prisma.student.findUnique({
			where: { id },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		await prisma.student.update({
			where: { id },
			data: { status: "LEFT" },
		});
	}

	async addToGroup(
		studentId: number,
		data: AddStudentToGroupDto,
	): Promise<{
		id: number;
		studentId: number;
		groupId: number;
		discount: number;
	}> {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		const group = await prisma.group.findUnique({
			where: { id: data.groupId },
		});

		if (!group) {
			throw new NotFoundError("Group not found");
		}

		if (!group.isActive) {
			throw new BadRequestError("Group is not active");
		}

		const existing = await prisma.studentGroup.findUnique({
			where: {
				studentId_groupId: {
					studentId,
					groupId: data.groupId,
				},
			},
		});

		if (existing) {
			throw new ConflictError("Student is already in this group");
		}

		const studentGroup = await prisma.studentGroup.create({
			data: {
				studentId,
				groupId: data.groupId,
				discount: data.discount,
			},
			select: {
				id: true,
				studentId: true,
				groupId: true,
				discount: true,
			},
		});

		return studentGroup;
	}

	async removeFromGroup(studentId: number, groupId: number): Promise<void> {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		const studentGroup = await prisma.studentGroup.findUnique({
			where: {
				studentId_groupId: {
					studentId,
					groupId,
				},
			},
		});

		if (!studentGroup) {
			throw new NotFoundError("Student is not in this group");
		}

		await prisma.studentGroup.delete({
			where: {
				studentId_groupId: {
					studentId,
					groupId,
				},
			},
		});
	}

	async updateClass(
		studentId: number,
		data: UpdateStudentClassDto,
	): Promise<Student> {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		const classExists = await prisma.class.findUnique({
			where: { id: data.classId },
		});

		if (!classExists) {
			throw new NotFoundError("Class not found");
		}

		await prisma.$transaction(async (tx) => {
			const existingClass = await tx.class.findFirst({
				where: { studentId },
			});

			if (existingClass && existingClass.id !== data.classId) {
				await tx.class.update({
					where: { id: existingClass.id },
					data: { studentId: null },
				});
			}

			await tx.class.update({
				where: { id: data.classId },
				data: { studentId },
			});
		});

		return this.findById(studentId);
	}
}
