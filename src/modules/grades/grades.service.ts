import { BadRequestError, NotFoundError } from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import {
	buildDateRangeFilter,
	calculatePagination,
	calculateTotalPages,
} from "@lib/utils";

import type {
	CreateGradeDto,
	GetGradesQueryDto,
	UpdateGradeDto,
} from "./grades.dto";
import type {
	Grade,
	GradeListResponse,
	StudentGradeStats,
} from "./grades.types";

export class GradesService {
	async create(data: CreateGradeDto): Promise<Grade> {
		if (!data.groupId && !data.subject) {
			throw new BadRequestError("Either groupId or subject must be provided");
		}

		const student = await prisma.student.findUnique({
			where: { id: data.studentId },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		let subject = data.subject;
		const groupId = data.groupId;

		if (groupId) {
			const group = await prisma.group.findUnique({
				where: { id: groupId },
				select: {
					id: true,
					course: {
						select: {
							name: true,
							subject: { select: { name: true } },
						},
					},
				},
			});

			if (!group) {
				throw new NotFoundError("Group not found");
			}

			const studentInGroup = await prisma.studentGroup.findUnique({
				where: {
					studentId_groupId: {
						studentId: data.studentId,
						groupId,
					},
				},
			});

			if (!studentInGroup) {
				throw new BadRequestError("Student is not in this group");
			}

			if (!subject) {
				subject = group.course.subject?.name || group.course.name;
			}
		}

		if (!subject) {
			throw new BadRequestError("Subject is required");
		}

		const grade = await prisma.grade.create({
			data: {
				studentId: data.studentId,
				groupId,
				subject,
				score: data.score,
				comment: data.comment,
				...(data.date && { date: data.date }),
			},
			select: {
				id: true,
				studentId: true,
				groupId: true,
				subject: true,
				score: true,
				comment: true,
				date: true,
				student: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				group: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		return grade;
	}

	async findAll(query: GetGradesQueryDto): Promise<GradeListResponse> {
		const {
			page,
			limit,
			studentId,
			groupId,
			subject,
			minScore,
			maxScore,
			startDate,
			endDate,
		} = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(studentId && { studentId }),
			...(groupId && { groupId }),
			...(subject && {
				subject: { contains: subject, mode: "insensitive" as const },
			}),
			...((minScore !== undefined || maxScore !== undefined) && {
				score: {
					...(minScore !== undefined && { gte: minScore }),
					...(maxScore !== undefined && { lte: maxScore }),
				},
			}),
			...buildDateRangeFilter(startDate, endDate, "date"),
		};

		const [grades, total] = await Promise.all([
			prisma.grade.findMany({
				where,
				select: {
					id: true,
					studentId: true,
					groupId: true,
					subject: true,
					score: true,
					comment: true,
					date: true,
					student: {
						select: {
							id: true,
							fullname: true,
							username: true,
						},
					},
					group: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: {
					date: "desc",
				},
				skip,
				take,
			}),
			prisma.grade.count({ where }),
		]);

		return {
			grades,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<Grade> {
		const grade = await prisma.grade.findUnique({
			where: { id },
			select: {
				id: true,
				studentId: true,
				groupId: true,
				subject: true,
				score: true,
				comment: true,
				date: true,
				student: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				group: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!grade) {
			throw new NotFoundError("Grade not found");
		}

		return grade;
	}

	async update(id: number, data: UpdateGradeDto): Promise<Grade> {
		const existing = await prisma.grade.findUnique({
			where: { id },
		});

		if (!existing) {
			throw new NotFoundError("Grade not found");
		}

		const grade = await prisma.grade.update({
			where: { id },
			data,
			select: {
				id: true,
				studentId: true,
				groupId: true,
				subject: true,
				score: true,
				comment: true,
				date: true,
				student: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				group: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		return grade;
	}

	async delete(id: number): Promise<void> {
		const grade = await prisma.grade.findUnique({
			where: { id },
		});

		if (!grade) {
			throw new NotFoundError("Grade not found");
		}

		await prisma.grade.delete({
			where: { id },
		});
	}

	async getStudentStats(studentId: number): Promise<StudentGradeStats> {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: {
				id: true,
				fullname: true,
				grades: {
					select: {
						subject: true,
						score: true,
					},
				},
			},
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		if (student.grades.length === 0) {
			return {
				studentId: student.id,
				studentName: student.fullname,
				totalGrades: 0,
				averageScore: 0,
				highestScore: 0,
				lowestScore: 0,
				subjects: [],
			};
		}

		const scores = student.grades.map((g) => g.score);
		const totalGrades = scores.length;
		const averageScore =
			scores.reduce((sum, score) => sum + score, 0) / totalGrades;
		const highestScore = Math.max(...scores);
		const lowestScore = Math.min(...scores);

		const subjectMap = new Map<string, { totalScore: number; count: number }>();

		for (const grade of student.grades) {
			const existing = subjectMap.get(grade.subject);
			if (existing) {
				existing.totalScore += grade.score;
				existing.count += 1;
			} else {
				subjectMap.set(grade.subject, {
					totalScore: grade.score,
					count: 1,
				});
			}
		}

		const subjects = Array.from(subjectMap.entries()).map(
			([subject, data]) => ({
				subject,
				averageScore: Number.parseFloat(
					(data.totalScore / data.count).toFixed(2),
				),
				gradeCount: data.count,
			}),
		);

		return {
			studentId: student.id,
			studentName: student.fullname,
			totalGrades,
			averageScore: Number.parseFloat(averageScore.toFixed(2)),
			highestScore,
			lowestScore,
			subjects,
		};
	}
}
