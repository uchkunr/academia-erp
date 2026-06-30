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
	BulkCreateAttendanceDto,
	CreateAttendanceDto,
	CreateStaffAttendanceDto,
	GetAttendancesQueryDto,
	GetStaffAttendanceQueryDto,
	UpdateAttendanceDto,
} from "./attendance.dto";
import type {
	Attendance,
	AttendanceListResponse,
	LessonAttendanceStats,
	StaffAttendanceListResponse,
	StaffAttendanceRecord,
} from "./attendance.types";

const attendanceSelect = {
	id: true,
	lessonId: true,
	studentId: true,
	userId: true,
	isPresent: true,
	timestamp: true,
	source: true,
	deviceLogId: true,
	lesson: {
		select: {
			id: true,
			date: true,
			group: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	},
	student: {
		select: {
			id: true,
			fullname: true,
			username: true,
		},
	},
	user: {
		select: {
			id: true,
			fullname: true,
			username: true,
		},
	},
};

export class AttendanceService {
	async create(data: CreateAttendanceDto): Promise<Attendance> {
		if (!data.studentId && !data.userId) {
			throw new BadRequestError("Either studentId or userId must be provided");
		}

		if (data.studentId && data.userId) {
			throw new BadRequestError("Cannot provide both studentId and userId");
		}

		const lesson = await prisma.lesson.findUnique({
			where: { id: data.lessonId },
		});

		if (!lesson) {
			throw new NotFoundError("Lesson not found");
		}

		if (data.studentId) {
			const student = await prisma.student.findUnique({
				where: { id: data.studentId },
			});

			if (!student) {
				throw new NotFoundError("Student not found");
			}

			const existing = await prisma.attendance.findFirst({
				where: {
					lessonId: data.lessonId,
					studentId: data.studentId,
				},
			});

			if (existing) {
				throw new ConflictError("Attendance already recorded for this student");
			}
		}

		if (data.userId) {
			const user = await prisma.user.findUnique({
				where: { id: data.userId },
			});

			if (!user) {
				throw new NotFoundError("User not found");
			}

			const existing = await prisma.attendance.findFirst({
				where: {
					lessonId: data.lessonId,
					userId: data.userId,
				},
			});

			if (existing) {
				throw new ConflictError("Attendance already recorded for this user");
			}
		}

		const attendance = await prisma.attendance.create({
			data: {
				lessonId: data.lessonId,
				studentId: data.studentId,
				userId: data.userId,
				isPresent: data.isPresent,
				source: "MANUAL",
			},
			select: attendanceSelect,
		});

		return attendance as Attendance;
	}

	async bulkCreate(data: BulkCreateAttendanceDto): Promise<Attendance[]> {
		const lesson = await prisma.lesson.findUnique({
			where: { id: data.lessonId },
		});

		if (!lesson) {
			throw new NotFoundError("Lesson not found");
		}

		const attendances = await Promise.all(
			data.attendances.map(async (item) => {
				if (!item.studentId && !item.userId) {
					throw new BadRequestError(
						"Either studentId or userId must be provided",
					);
				}

				if (item.studentId && item.userId) {
					throw new BadRequestError("Cannot provide both studentId and userId");
				}

				const existing = await prisma.attendance.findFirst({
					where: {
						lessonId: data.lessonId,
						...(item.studentId && { studentId: item.studentId }),
						...(item.userId && { userId: item.userId }),
					},
				});

				if (existing) {
					const fullExisting = await prisma.attendance.findUnique({
						where: { id: existing.id },
						select: attendanceSelect,
					});
					if (!fullExisting) {
						throw new NotFoundError("Attendance not found");
					}
					return fullExisting;
				}

				return prisma.attendance.create({
					data: {
						lessonId: data.lessonId,
						studentId: item.studentId,
						userId: item.userId,
						isPresent: item.isPresent,
						source: "MANUAL",
						...(data.startDate && { timestamp: data.startDate }),
					},
					select: attendanceSelect,
				});
			}),
		);

		return attendances;
	}

	async findAll(
		query: GetAttendancesQueryDto,
	): Promise<AttendanceListResponse> {
		const {
			page,
			limit,
			lessonId,
			studentId,
			userId,
			groupId,
			startDate,
			endDate,
			isPresent,
		} = query;
		const { skip, take } = calculatePagination(page, limit);

		const dateFilter = buildDateRangeFilterForLesson(startDate, endDate);

		const lessonFilter = {
			...(groupId && { groupId }),
			...dateFilter,
		};

		const where = {
			...(lessonId && { lessonId }),
			...(studentId && { studentId }),
			...(userId && { userId }),
			...(isPresent !== undefined && { isPresent }),
			...(Object.keys(lessonFilter).length > 0 && {
				lesson: lessonFilter,
			}),
		};

		const [attendances, total] = await Promise.all([
			prisma.attendance.findMany({
				where,
				select: attendanceSelect,
				orderBy: {
					timestamp: "desc",
				},
				skip,
				take,
			}),
			prisma.attendance.count({ where }),
		]);

		return {
			attendances,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<Attendance> {
		const attendance = await prisma.attendance.findUnique({
			where: { id },
			select: attendanceSelect,
		});

		if (!attendance) {
			throw new NotFoundError("Attendance not found");
		}

		return attendance as Attendance;
	}

	async update(id: number, data: UpdateAttendanceDto): Promise<Attendance> {
		const existing = await prisma.attendance.findUnique({
			where: { id },
		});

		if (!existing) {
			throw new NotFoundError("Attendance not found");
		}

		const attendance = await prisma.attendance.update({
			where: { id },
			data: {
				isPresent: data.isPresent,
			},
			select: attendanceSelect,
		});

		return attendance as Attendance;
	}

	async processDeviceLogsToAttendance(): Promise<{
		processed: number;
		attendancesCreated: number;
	}> {
		const logs = await prisma.deviceLog.findMany({
			where: { isProcessed: false },
			orderBy: { timestamp: "asc" },
		});

		let attendancesCreated = 0;

		for (const log of logs) {
			const eventDate = new Date(log.timestamp);
			eventDate.setHours(0, 0, 0, 0);

			const student = await prisma.student.findUnique({
				where: { externalId: log.externalUserId },
				select: { id: true },
			});

			if (student) {
				const studentGroups = await prisma.studentGroup.findMany({
					where: { studentId: student.id },
					select: { groupId: true },
				});
				const groupIds = studentGroups.map((sg) => sg.groupId);

				const lesson = await prisma.lesson.findFirst({
					where: {
						groupId: { in: groupIds },
						date: {
							gte: eventDate,
							lt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
						},
					},
					select: { id: true },
				});

				if (lesson) {
					const existing = await prisma.attendance.findFirst({
						where: {
							lessonId: lesson.id,
							studentId: student.id,
						},
					});
					if (!existing) {
						await prisma.attendance.create({
							data: {
								lessonId: lesson.id,
								studentId: student.id,
								isPresent: true,
								timestamp: log.timestamp,
								source: "HIKVISION",
								deviceLogId: log.id,
							},
						});
						attendancesCreated++;
					}
				}
			} else {
				const user = await prisma.user.findUnique({
					where: { externalId: log.externalUserId },
					select: { id: true },
				});

				if (user) {
					const lesson = await prisma.lesson.findFirst({
						where: {
							group: { teacherId: user.id },
							date: {
								gte: eventDate,
								lt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
							},
						},
						select: { id: true },
					});

					if (lesson) {
						const existing = await prisma.attendance.findFirst({
							where: {
								lessonId: lesson.id,
								userId: user.id,
							},
						});
						if (!existing) {
							await prisma.attendance.create({
								data: {
									lessonId: lesson.id,
									userId: user.id,
									isPresent: true,
									timestamp: log.timestamp,
									source: "HIKVISION",
									deviceLogId: log.id,
								},
							});
							attendancesCreated++;
						}
					}
				}
			}

			await prisma.deviceLog.update({
				where: { id: log.id },
				data: { isProcessed: true },
			});
		}

		return { processed: logs.length, attendancesCreated };
	}

	async getStaffAttendance(
		query: GetStaffAttendanceQueryDto,
	): Promise<StaffAttendanceListResponse> {
		const { page, limit, userId } = query;
		const date = query.date || new Date();
		const { skip, take } = calculatePagination(page, limit);

		const monthStart = new Date(date);
		monthStart.setDate(1);
		monthStart.setHours(0, 0, 0, 0);
		const monthEnd = new Date(
			monthStart.getFullYear(),
			monthStart.getMonth() + 1,
			0,
			23,
			59,
			59,
			999,
		);

		const usersWithExternal = await prisma.user.findMany({
			where: {
				externalId: { not: null },
				...(userId && { id: userId }),
			},
			select: {
				id: true,
				fullname: true,
				username: true,
				role: true,
				externalId: true,
			},
		});

		const externalIdToUser = new Map<
			string,
			(typeof usersWithExternal)[number]
		>();
		for (const u of usersWithExternal) {
			if (u.externalId) {
				externalIdToUser.set(u.externalId, u);
			}
		}

		const allLogs = await prisma.deviceLog.findMany({
			where: {
				timestamp: { gte: monthStart, lte: monthEnd },
				externalUserId: {
					in: usersWithExternal
						.map((u) => u.externalId)
						.filter(Boolean) as string[],
				},
			},
			orderBy: { timestamp: "asc" },
		});

		const logsByUserDate = new Map<
			string,
			{ id: number; timestamp: Date; direction: string }[]
		>();
		for (const log of allLogs) {
			const user = externalIdToUser.get(log.externalUserId);
			if (!user) continue;
			const dayKey = `${user.id}_${log.timestamp.toISOString().split("T")[0]}`;
			let logs = logsByUserDate.get(dayKey);
			if (!logs) {
				logs = [];
				logsByUserDate.set(dayKey, logs);
			}
			logs.push({
				id: log.id,
				timestamp: log.timestamp,
				direction: log.direction,
			});
		}

		const manualRecords = await prisma.staffAttendance.findMany({
			where: {
				date: { gte: monthStart, lte: monthEnd },
				...(userId && { userId }),
			},
			include: {
				user: {
					select: { id: true, fullname: true, username: true, role: true },
				},
			},
		});

		const recordsMap = new Map<string, StaffAttendanceRecord>();

		for (const [dayKey, logs] of logsByUserDate) {
			const [uid, dateStr] = dayKey.split("_");
			const user = usersWithExternal.find((u) => u.id === Number(uid));
			if (!user) continue;

			const sorted = logs.sort(
				(a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
			);

			recordsMap.set(dayKey, {
				user: {
					id: user.id,
					fullname: user.fullname,
					username: user.username,
					role: user.role,
				},
				date: dateStr,
				checkIn: sorted.length > 0 ? sorted[0].timestamp : null,
				checkOut:
					sorted.length > 1 ? sorted[sorted.length - 1].timestamp : null,
				totalLogs: sorted.length,
				logs: sorted,
			});
		}

		for (const manual of manualRecords) {
			const dateStr = manual.date.toISOString().split("T")[0];
			const dayKey = `${manual.userId}_${dateStr}`;

			const existing = recordsMap.get(dayKey);
			if (!existing) {
				recordsMap.set(dayKey, {
					user: manual.user,
					date: dateStr,
					checkIn: manual.checkIn,
					checkOut: manual.checkOut,
					totalLogs: 0,
					logs: [],
				});
			} else {
				if (manual.checkIn) existing.checkIn = manual.checkIn;
				if (manual.checkOut) existing.checkOut = manual.checkOut;
			}
		}

		const records = [...recordsMap.values()].sort((a, b) =>
			a.date.localeCompare(b.date),
		);
		const total = records.length;
		const paged = records.slice(skip, skip + take);

		return {
			items: paged,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async delete(id: number): Promise<void> {
		const attendance = await prisma.attendance.findUnique({
			where: { id },
		});

		if (!attendance) {
			throw new NotFoundError("Attendance not found");
		}

		await prisma.attendance.delete({
			where: { id },
		});
	}

	async createStaffAttendance(data: CreateStaffAttendanceDto) {
		const user = await prisma.user.findUnique({
			where: { id: data.userId },
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		const date = new Date(`${data.date}T00:00:00`);
		const checkIn = data.checkIn
			? new Date(`${data.date}T${data.checkIn}:00`)
			: null;
		const checkOut = data.checkOut
			? new Date(`${data.date}T${data.checkOut}:00`)
			: null;

		const existing = await prisma.staffAttendance.findUnique({
			where: { userId_date: { userId: data.userId, date } },
		});

		const updateData: { checkIn?: Date | null; checkOut?: Date | null } = {};
		if (data.checkIn !== undefined) updateData.checkIn = checkIn;
		if (data.checkOut !== undefined) updateData.checkOut = checkOut;

		const staffAttendance = await prisma.staffAttendance.upsert({
			where: { userId_date: { userId: data.userId, date } },
			update: updateData,
			create: { userId: data.userId, date, checkIn, checkOut },
		});

		return {
			record: {
				id: staffAttendance.id,
				userId: staffAttendance.userId,
				date: data.date,
				checkIn: staffAttendance.checkIn,
				checkOut: staffAttendance.checkOut,
				createdAt: staffAttendance.createdAt,
				updatedAt: staffAttendance.updatedAt,
			},
			isNew: !existing,
		};
	}

	async getLessonStats(lessonId: number): Promise<LessonAttendanceStats> {
		const lesson = await prisma.lesson.findUnique({
			where: { id: lessonId },
			select: {
				id: true,
				date: true,
				group: {
					select: {
						name: true,
						students: {
							select: {
								id: true,
							},
						},
					},
				},
				attendance: {
					where: {
						studentId: { not: null },
					},
					select: {
						studentId: true,
						isPresent: true,
					},
				},
			},
		});

		if (!lesson) {
			throw new NotFoundError("Lesson not found");
		}

		const groupStudentIds = new Set(lesson.group.students.map((s) => s.id));
		const groupAttendance = lesson.attendance.filter(
			(a) => a.studentId !== null && groupStudentIds.has(a.studentId),
		);
		const totalStudents = groupStudentIds.size;
		const presentCount = groupAttendance.filter((a) => a.isPresent).length;
		const absentCount = totalStudents - presentCount;
		const attendanceRate =
			totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

		return {
			lessonId: lesson.id,
			date: lesson.date,
			groupName: lesson.group.name,
			totalStudents,
			presentCount,
			absentCount,
			attendanceRate: Number.parseFloat(attendanceRate.toFixed(2)),
		};
	}
}
