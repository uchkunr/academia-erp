import { prisma } from "@lib/prisma";
import { groupPaymentsByMethod } from "@lib/utils";

import type {
	CenterProfitQueryDto,
	DailyRevenueQueryDto,
	DebtorsQueryDto,
	GroupProfitabilityQueryDto,
	MonthlyRevenueQueryDto,
	TeacherPerformanceQueryDto,
} from "./reports.dto";
import type {
	CenterProfitReport,
	DailyRevenueReport,
	DebtorsReport,
	GroupProfitabilityReport,
	MonthlyRevenueReport,
	TeacherPerformanceReport,
} from "./reports.types";

export class ReportsService {
	async getDailyRevenue(
		query: DailyRevenueQueryDto,
	): Promise<DailyRevenueReport> {
		const { date } = query;
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		const payments = await prisma.payment.findMany({
			where: {
				createdAt: {
					gte: startOfDay,
					lte: endOfDay,
				},
				isCancelled: false,
			},
			select: {
				amount: true,
				method: true,
			},
		});

		const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
		const paymentsByMethod = groupPaymentsByMethod(payments);

		return {
			date: date.toISOString().split("T")[0],
			totalRevenue,
			paymentCount: payments.length,
			paymentsByMethod,
		};
	}

	async getMonthlyRevenue(
		query: MonthlyRevenueQueryDto,
	): Promise<MonthlyRevenueReport> {
		const { year, month } = query;
		const startDate = new Date(year, month - 1, 1);
		const endDate = new Date(year, month, 0, 23, 59, 59, 999);

		const payments = await prisma.payment.findMany({
			where: {
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
				isCancelled: false,
			},
			select: {
				amount: true,
				method: true,
				createdAt: true,
			},
		});

		const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
		const paymentsByMethod = groupPaymentsByMethod(payments);

		const dailyBreakdown = Object.entries(
			payments.reduce(
				(acc, p) => {
					const date = new Date(p.createdAt);
					date.setHours(0, 0, 0, 0);
					const key = date.toISOString().split("T")[0];
					if (!acc[key]) {
						acc[key] = { date: key, amount: 0, count: 0 };
					}
					acc[key].amount += p.amount;
					acc[key].count += 1;
					return acc;
				},
				{} as Record<string, { date: string; amount: number; count: number }>,
			),
		)
			.map(([, data]) => data)
			.sort((a, b) => a.date.localeCompare(b.date));

		return {
			month: `${year}-${month.toString().padStart(2, "0")}`,
			totalRevenue,
			paymentCount: payments.length,
			paymentsByMethod,
			dailyBreakdown,
		};
	}

	async getDebtors(query: DebtorsQueryDto): Promise<DebtorsReport> {
		const { minDebt } = query;

		const students = await prisma.student.findMany({
			where: {
				status: { not: "LEFT" },
				balance: {
					lt: -minDebt,
				},
			},
			select: {
				id: true,
				fullname: true,
				phone: true,
				status: true,
				balance: true,
				groups: {
					select: {
						group: {
							select: {
								id: true,
								name: true,
								course: {
									select: {
										name: true,
										price: true,
									},
								},
							},
						},
					},
				},
				payments: {
					orderBy: {
						createdAt: "desc",
					},
					take: 1,
					select: {
						createdAt: true,
						amount: true,
					},
				},
			},
		});

		const formattedStudents = students.map((s) => ({
			id: s.id,
			fullname: s.fullname,
			phone: s.phone,
			status: s.status,
			balance: s.balance,
			groups: s.groups.map((sg) => ({
				id: sg.group.id,
				name: sg.group.name,
				course: sg.group.course,
			})),
			lastPayment: s.payments[0]
				? {
						date: s.payments[0].createdAt.toISOString().split("T")[0],
						amount: s.payments[0].amount,
					}
				: null,
		}));

		const totalDebt = students.reduce((sum, s) => sum + Math.abs(s.balance), 0);

		return {
			students: formattedStudents,
			totalDebt,
			debtorCount: students.length,
		};
	}

	async getGroupProfitability(
		_query: GroupProfitabilityQueryDto,
	): Promise<GroupProfitabilityReport> {
		const groups = await prisma.group.findMany({
			where: {
				isActive: true,
			},
			select: {
				id: true,
				name: true,
				teacherRate: true,
				course: {
					select: {
						name: true,
						price: true,
					},
				},
				teacher: {
					select: {
						fullname: true,
					},
				},
				_count: {
					select: {
						students: true,
					},
				},
			},
		});

		const groupsWithProfit = groups.map((g) => {
			const studentCount = g._count.students;
			const monthlyRevenue = g.course.price * studentCount;
			const teacherRate = g.teacherRate ?? 0;
			const teacherCost = teacherRate * studentCount;
			const profit = monthlyRevenue - teacherCost;
			const profitMargin =
				monthlyRevenue > 0 ? (profit / monthlyRevenue) * 100 : 0;

			return {
				id: g.id,
				name: g.name,
				course: g.course,
				teacher: g.teacher,
				teacherRate,
				studentCount,
				monthlyRevenue,
				teacherCost,
				profit,
				profitMargin,
			};
		});

		const totalRevenue = groupsWithProfit.reduce(
			(sum, g) => sum + g.monthlyRevenue,
			0,
		);
		const totalTeacherCost = groupsWithProfit.reduce(
			(sum, g) => sum + g.teacherCost,
			0,
		);
		const totalProfit = totalRevenue - totalTeacherCost;

		return {
			groups: groupsWithProfit,
			totalRevenue,
			totalTeacherCost,
			totalProfit,
		};
	}

	async getTeacherPerformance(
		query: TeacherPerformanceQueryDto,
	): Promise<TeacherPerformanceReport> {
		const { teacherId } = query;

		const teachers = await prisma.user.findMany({
			where: {
				role: "TEACHER",
				isActive: true,
				...(teacherId && { id: teacherId }),
			},
			select: {
				id: true,
				fullname: true,
				teacherSubjectLevels: {
					select: {
						subjectId: true,
						level: true,
					},
				},
				groups: {
					where: {
						isActive: true,
					},
					select: {
						id: true,
						name: true,
						teacherRate: true,
						course: {
							select: {
								price: true,
								subjectId: true,
								subject: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
						_count: {
							select: {
								students: true,
							},
						},
						lessons: {
							select: {
								_count: {
									select: {
										attendance: true,
									},
								},
								attendance: {
									where: {
										isPresent: true,
									},
								},
							},
						},
					},
				},
			},
		});

		const teachersWithPerformance = teachers.map((t) => {
			const subjectLevelMap = new Map(
				t.teacherSubjectLevels.map((sl) => [sl.subjectId, sl.level]),
			);

			const groups = t.groups.map((g) => {
				const studentCount = g._count.students;
				const revenue = g.course.price * studentCount;
				const teacherRate = g.teacherRate ?? 0;
				const earnings = teacherRate * studentCount;

				const totalAttendanceSlots = g.lessons.reduce(
					(sum, l) => sum + l._count.attendance,
					0,
				);
				const totalPresent = g.lessons.reduce(
					(sum, l) => sum + l.attendance.length,
					0,
				);
				const attendanceRate =
					totalAttendanceSlots > 0
						? (totalPresent / totalAttendanceSlots) * 100
						: 0;

				const teacherLevel = g.course.subjectId
					? (subjectLevelMap.get(g.course.subjectId) ?? null)
					: null;

				return {
					id: g.id,
					name: g.name,
					studentCount,
					attendanceRate,
					revenue,
					teacherRate,
					earnings,
					subject: g.course.subject,
					teacherLevel,
				};
			});

			const totalStudents = groups.reduce((sum, g) => sum + g.studentCount, 0);
			const totalRevenue = groups.reduce((sum, g) => sum + g.revenue, 0);
			const totalEarnings = groups.reduce((sum, g) => sum + g.earnings, 0);
			const averageAttendance =
				groups.length > 0
					? groups.reduce((sum, g) => sum + g.attendanceRate, 0) / groups.length
					: 0;

			return {
				id: t.id,
				fullname: t.fullname,
				groups,
				totalStudents,
				totalRevenue,
				totalEarnings,
				averageAttendance,
			};
		});

		return {
			teachers: teachersWithPerformance,
		};
	}

	async getCenterProfit(
		query: CenterProfitQueryDto,
	): Promise<CenterProfitReport> {
		const { dateFrom, dateTo } = query;

		const payments = await prisma.payment.findMany({
			where: {
				createdAt: {
					gte: dateFrom,
					lte: dateTo,
				},
				isCancelled: false,
			},
			select: {
				amount: true,
				createdAt: true,
			},
		});

		const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

		const groups = await prisma.group.findMany({
			where: {
				isActive: true,
			},
			select: {
				teacherRate: true,
				_count: {
					select: {
						students: true,
					},
				},
			},
		});

		const totalTeacherCosts = groups.reduce(
			(sum, g) => sum + (g.teacherRate ?? 0) * g._count.students,
			0,
		);

		const totalProfit = totalRevenue - totalTeacherCosts;
		const profitMargin =
			totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

		const studentCount = await prisma.student.count({
			where: {
				status: "ACTIVE",
			},
		});

		const activeGroups = groups.length;

		const revenueByMonth = Object.entries(
			payments.reduce(
				(acc, p) => {
					const date = new Date(p.createdAt);
					const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
					if (!acc[key]) {
						acc[key] = 0;
					}
					acc[key] += p.amount;
					return acc;
				},
				{} as Record<string, number>,
			),
		).map(([month, revenue]) => ({
			month,
			revenue,
			costs: totalTeacherCosts,
			profit: revenue - totalTeacherCosts,
		}));

		return {
			period: {
				from: dateFrom.toISOString().split("T")[0],
				to: dateTo.toISOString().split("T")[0],
			},
			totalRevenue,
			totalTeacherCosts,
			totalProfit,
			profitMargin,
			studentCount,
			activeGroups,
			revenueByMonth,
		};
	}
}
