import { Elysia, t } from "elysia";
import { ReportsService } from "./reports.service";

const reportsService = new ReportsService();

const unauthorizedResponse = t.Object(
	{ message: t.String() },
	{ description: "Unauthorized" },
);

export const reportsController = new Elysia({ prefix: "/reports" })
	.get(
		"/daily-revenue",
		async ({ query }) => {
			const result = await reportsService.getDailyRevenue({
				date: new Date(query.date),
			});
			return { data: result };
		},
		{
			query: t.Object({
				date: t.String({
					description: "Date in YYYY-MM-DD format",
					examples: ["2026-03-06"],
				}),
			}),
			response: {
				200: t.Object({
					data: t.Object({
						date: t.String(),
						totalRevenue: t.Number(),
						paymentCount: t.Number(),
						paymentsByMethod: t.Array(
							t.Object({
								method: t.String(),
								amount: t.Number(),
								count: t.Number(),
							}),
						),
					}),
				}),
				401: unauthorizedResponse,
			},
			detail: {
				tags: ["Reports"],
				summary: "Get daily revenue report",
				description:
					"Retrieves revenue statistics for a specific date including total revenue, payment count, and breakdown by payment method.",
			},
		},
	)
	.get(
		"/monthly-revenue",
		async ({ query }) => {
			const result = await reportsService.getMonthlyRevenue({
				year: Number(query.year),
				month: Number(query.month),
			});
			return { data: result };
		},
		{
			query: t.Object({
				year: t.Numeric({ description: "Year (e.g. 2026)", examples: [2026] }),
				month: t.Numeric({
					description: "Month (1-12)",
					minimum: 1,
					maximum: 12,
					examples: [3],
				}),
			}),
			response: {
				200: t.Object({
					data: t.Object({
						month: t.String(),
						totalRevenue: t.Number(),
						paymentCount: t.Number(),
						paymentsByMethod: t.Array(
							t.Object({
								method: t.String(),
								amount: t.Number(),
								count: t.Number(),
							}),
						),
						dailyBreakdown: t.Array(
							t.Object({
								date: t.String(),
								amount: t.Number(),
								count: t.Number(),
							}),
						),
					}),
				}),
				401: unauthorizedResponse,
			},
			detail: {
				tags: ["Reports"],
				summary: "Get monthly revenue report",
				description:
					"Retrieves revenue statistics for a specific month including total revenue, payment count, breakdown by payment method, and daily breakdown.",
			},
		},
	)
	.get(
		"/debtors",
		async ({ query }) => {
			const result = await reportsService.getDebtors({
				minDebt: Number(query.minDebt ?? 0),
			});
			return { data: result };
		},
		{
			query: t.Object({
				minDebt: t.Optional(
					t.Numeric({
						description: "Minimum debt amount filter (default: 0)",
						examples: [0],
					}),
				),
			}),
			response: {
				200: t.Object({
					data: t.Object({
						students: t.Array(
							t.Object({
								id: t.Number(),
								fullname: t.String(),
								phone: t.Union([t.String(), t.Null()]),
								status: t.String(),
								balance: t.Number(),
								groups: t.Array(
									t.Object({
										id: t.Number(),
										name: t.String(),
										course: t.Object({
											name: t.String(),
											price: t.Number(),
										}),
									}),
								),
								lastPayment: t.Union([
									t.Object({
										date: t.String(),
										amount: t.Number(),
									}),
									t.Null(),
								]),
							}),
						),
						totalDebt: t.Number(),
						debtorCount: t.Number(),
					}),
				}),
				401: unauthorizedResponse,
			},
			detail: {
				tags: ["Reports"],
				summary: "Get debtors list",
				description:
					"Retrieves a list of students who have outstanding debts. Optionally filters by minimum debt amount.",
			},
		},
	)
	.get(
		"/group-profitability",
		async ({ query }) => {
			const result = await reportsService.getGroupProfitability({
				year: query.year ? Number(query.year) : undefined,
				month: query.month ? Number(query.month) : undefined,
			});
			return { data: result };
		},
		{
			query: t.Object({
				year: t.Optional(
					t.Numeric({ description: "Year filter", examples: [2026] }),
				),
				month: t.Optional(
					t.Numeric({
						description: "Month filter (1-12)",
						minimum: 1,
						maximum: 12,
						examples: [3],
					}),
				),
			}),
			response: {
				200: t.Object({
					data: t.Object({
						groups: t.Array(
							t.Object({
								id: t.Number(),
								name: t.String(),
								course: t.Object({
									name: t.String(),
									price: t.Number(),
								}),
								teacher: t.Union([
									t.Object({ fullname: t.String() }),
									t.Null(),
								]),
								teacherRate: t.Union([t.Number(), t.Null()]),
								studentCount: t.Number(),
								monthlyRevenue: t.Number(),
								teacherCost: t.Number(),
								profit: t.Number(),
								profitMargin: t.Number(),
							}),
						),
						totalRevenue: t.Number(),
						totalTeacherCost: t.Number(),
						totalProfit: t.Number(),
					}),
				}),
				401: unauthorizedResponse,
			},
			detail: {
				tags: ["Reports"],
				summary: "Get group profitability report",
				description:
					"Analyzes profitability of all active groups including monthly revenue, teacher costs, profit, and profit margin percentage.",
			},
		},
	)
	.get(
		"/teacher-performance",
		async ({ query }) => {
			const result = await reportsService.getTeacherPerformance({
				year: query.year ? Number(query.year) : undefined,
				month: query.month ? Number(query.month) : undefined,
				teacherId: query.teacherId ? Number(query.teacherId) : undefined,
			});
			return { data: result };
		},
		{
			query: t.Object({
				year: t.Optional(
					t.Numeric({ description: "Year filter", examples: [2026] }),
				),
				month: t.Optional(
					t.Numeric({
						description: "Month filter (1-12)",
						minimum: 1,
						maximum: 12,
						examples: [3],
					}),
				),
				teacherId: t.Optional(
					t.Numeric({ description: "Filter by specific teacher ID" }),
				),
			}),
			response: {
				200: t.Object({
					data: t.Object({
						teachers: t.Array(
							t.Object({
								id: t.Number(),
								fullname: t.String(),
								groups: t.Array(
									t.Object({
										id: t.Number(),
										name: t.String(),
										studentCount: t.Number(),
										attendanceRate: t.Number(),
										revenue: t.Number(),
										teacherRate: t.Union([t.Number(), t.Null()]),
										earnings: t.Number(),
										subject: t.Union([
											t.Object({ id: t.Number(), name: t.String() }),
											t.Null(),
										]),
										teacherLevel: t.Union([t.String(), t.Null()]),
									}),
								),
								totalStudents: t.Number(),
								totalRevenue: t.Number(),
								totalEarnings: t.Number(),
								averageAttendance: t.Number(),
							}),
						),
					}),
				}),
				401: unauthorizedResponse,
			},
			detail: {
				tags: ["Reports"],
				summary: "Get teacher performance report",
				description:
					"Analyzes teacher performance including total students, revenue generated, earnings, attendance rates. Can filter by specific teacher.",
			},
		},
	)
	.get(
		"/center-profit",
		async ({ query }) => {
			const result = await reportsService.getCenterProfit({
				dateFrom: new Date(query.dateFrom),
				dateTo: new Date(query.dateTo),
			});
			return { data: result };
		},
		{
			query: t.Object({
				dateFrom: t.String({
					description: "Start date in YYYY-MM-DD format",
					examples: ["2026-01-01"],
				}),
				dateTo: t.String({
					description: "End date in YYYY-MM-DD format",
					examples: ["2026-03-31"],
				}),
			}),
			response: {
				200: t.Object({
					data: t.Object({
						period: t.Object({
							from: t.String(),
							to: t.String(),
						}),
						totalRevenue: t.Number(),
						totalTeacherCosts: t.Number(),
						totalProfit: t.Number(),
						profitMargin: t.Number(),
						studentCount: t.Number(),
						activeGroups: t.Number(),
						revenueByMonth: t.Array(
							t.Object({
								month: t.String(),
								revenue: t.Number(),
								costs: t.Number(),
								profit: t.Number(),
							}),
						),
					}),
				}),
				401: unauthorizedResponse,
			},
			detail: {
				tags: ["Reports"],
				summary: "Get center profit report",
				description:
					"Retrieves comprehensive profit analysis for the educational center over a specified date range. Includes total revenue, teacher costs, net profit, profit margin, student count, active groups, and monthly breakdown.",
			},
		},
	);
