import { BadRequestError, NotFoundError } from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import { calculatePagination, calculateTotalPages } from "@lib/utils";

import type {
	CreateCashHandoverDto,
	CreateTeacherPaymentDto,
	GetCashHandoversQueryDto,
	GetTeacherPaymentsQueryDto,
	TeacherSalaryQueryDto,
} from "./finance.dto";

export class FinanceService {
	async getCashBalances() {
		const users = await prisma.user.findMany({
			where: {
				role: { in: ["CASHIER", "ADMIN"] },
				isActive: true,
			},
			select: {
				id: true,
				fullname: true,
				username: true,
				role: true,
			},
		});

		const balances = await Promise.all(
			users.map(async (user) => {
				const collected = await prisma.payment.aggregate({
					where: {
						receivedById: user.id,
						method: "CASH",
						isCancelled: false,
					},
					_sum: { amount: true },
				});

				const handedOver = await prisma.cashHandover.aggregate({
					where: {
						fromUserId: user.id,
						status: "APPROVED",
					},
					_sum: { amount: true },
				});

				const pending = await prisma.cashHandover.aggregate({
					where: {
						fromUserId: user.id,
						status: "PENDING",
					},
					_sum: { amount: true },
				});

				const totalCollected = collected._sum.amount || 0;
				const totalHandedOver = handedOver._sum.amount || 0;
				const pendingAmount = pending._sum.amount || 0;
				const balance = totalCollected - totalHandedOver;

				return {
					user,
					totalCollected,
					totalHandedOver,
					pendingAmount,
					balance,
				};
			}),
		);

		return balances;
	}

	async getMyBalance(userId: number) {
		const collected = await prisma.payment.aggregate({
			where: {
				receivedById: userId,
				method: "CASH",
				isCancelled: false,
			},
			_sum: { amount: true },
		});

		const handedOver = await prisma.cashHandover.aggregate({
			where: {
				fromUserId: userId,
				status: "APPROVED",
			},
			_sum: { amount: true },
		});

		const pending = await prisma.cashHandover.aggregate({
			where: {
				fromUserId: userId,
				status: "PENDING",
			},
			_sum: { amount: true },
		});

		const totalCollected = collected._sum.amount || 0;
		const totalHandedOver = handedOver._sum.amount || 0;
		const pendingAmount = pending._sum.amount || 0;

		return {
			totalCollected,
			totalHandedOver,
			pendingAmount,
			balance: totalCollected - totalHandedOver,
		};
	}

	async createCashHandover(data: CreateCashHandoverDto, fromUserId: number) {
		const balance = await this.getMyBalance(fromUserId);

		if (data.amount > balance.balance) {
			throw new BadRequestError(
				`Insufficient balance. Your current balance is ${balance.balance}`,
			);
		}

		const owner = await prisma.user.findFirst({
			where: { role: "OWNER", isActive: true },
			select: { id: true },
		});

		if (!owner) {
			throw new NotFoundError("Owner not found");
		}

		const handover = await prisma.cashHandover.create({
			data: {
				fromUserId,
				toUserId: owner.id,
				amount: data.amount,
				note: data.note,
			},
			select: {
				id: true,
				amount: true,
				status: true,
				note: true,
				createdAt: true,
				fromUser: {
					select: { id: true, fullname: true, username: true, role: true },
				},
				toUser: {
					select: { id: true, fullname: true },
				},
			},
		});

		return handover;
	}

	async getCashHandovers(query: GetCashHandoversQueryDto) {
		const { page, limit, status, fromUserId, startDate, endDate } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(status && { status }),
			...(fromUserId && { fromUserId }),
			...(startDate &&
				endDate && {
					createdAt: {
						gte: startDate,
						lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
					},
				}),
		};

		const [handovers, total] = await Promise.all([
			prisma.cashHandover.findMany({
				where,
				select: {
					id: true,
					amount: true,
					status: true,
					note: true,
					approvedAt: true,
					createdAt: true,
					fromUser: {
						select: { id: true, fullname: true, username: true, role: true },
					},
					toUser: {
						select: { id: true, fullname: true },
					},
				},
				orderBy: { createdAt: "desc" },
				skip,
				take,
			}),
			prisma.cashHandover.count({ where }),
		]);

		return {
			handovers,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async approveHandover(id: number) {
		const handover = await prisma.cashHandover.findUnique({
			where: { id },
		});

		if (!handover) {
			throw new NotFoundError("Handover not found");
		}

		if (handover.status !== "PENDING") {
			throw new BadRequestError("Handover is not pending");
		}

		const updated = await prisma.cashHandover.update({
			where: { id },
			data: {
				status: "APPROVED",
				approvedAt: new Date(),
			},
			select: {
				id: true,
				amount: true,
				status: true,
				note: true,
				approvedAt: true,
				createdAt: true,
				fromUser: {
					select: { id: true, fullname: true, username: true, role: true },
				},
				toUser: {
					select: { id: true, fullname: true },
				},
			},
		});

		return updated;
	}

	async rejectHandover(id: number) {
		const handover = await prisma.cashHandover.findUnique({
			where: { id },
		});

		if (!handover) {
			throw new NotFoundError("Handover not found");
		}

		if (handover.status !== "PENDING") {
			throw new BadRequestError("Handover is not pending");
		}

		const updated = await prisma.cashHandover.update({
			where: { id },
			data: { status: "REJECTED" },
			select: {
				id: true,
				amount: true,
				status: true,
				note: true,
				createdAt: true,
				fromUser: {
					select: { id: true, fullname: true, username: true, role: true },
				},
				toUser: {
					select: { id: true, fullname: true },
				},
			},
		});

		return updated;
	}

	async createTeacherPayment(data: CreateTeacherPaymentDto, paidById: number) {
		const teacher = await prisma.user.findUnique({
			where: { id: data.teacherId },
		});

		if (!teacher) {
			throw new NotFoundError("Teacher not found");
		}

		if (teacher.role !== "TEACHER") {
			throw new BadRequestError("User is not a teacher");
		}

		const payment = await prisma.teacherPayment.create({
			data: {
				teacherId: data.teacherId,
				amount: data.amount,
				type: data.type,
				month: data.month,
				description: data.description,
				paidById,
			},
			select: {
				id: true,
				amount: true,
				type: true,
				month: true,
				description: true,
				createdAt: true,
				teacher: {
					select: { id: true, fullname: true, username: true },
				},
				paidBy: {
					select: { id: true, fullname: true },
				},
			},
		});

		return payment;
	}

	async getTeacherPayments(query: GetTeacherPaymentsQueryDto) {
		const { page, limit, teacherId, type, month } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(teacherId && { teacherId }),
			...(type && { type }),
			...(month && { month }),
		};

		const [payments, total] = await Promise.all([
			prisma.teacherPayment.findMany({
				where,
				select: {
					id: true,
					amount: true,
					type: true,
					month: true,
					description: true,
					createdAt: true,
					teacher: {
						select: { id: true, fullname: true, username: true },
					},
					paidBy: {
						select: { id: true, fullname: true },
					},
				},
				orderBy: { createdAt: "desc" },
				skip,
				take,
			}),
			prisma.teacherPayment.count({ where }),
		]);

		return {
			payments,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async getTeacherSalary(teacherId: number, query: TeacherSalaryQueryDto) {
		const { year, month } = query;

		const teacher = await prisma.user.findUnique({
			where: { id: teacherId },
			select: { id: true, fullname: true, username: true, role: true },
		});

		if (!teacher) {
			throw new NotFoundError("Teacher not found");
		}

		const groups = await prisma.group.findMany({
			where: { teacherId, isActive: true },
			select: {
				id: true,
				name: true,
				teacherRate: true,
				course: {
					select: { name: true, price: true },
				},
				_count: {
					select: { students: true },
				},
			},
		});

		const monthStart = new Date(year, month - 1, 1);
		const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

		const groupDetails = await Promise.all(
			groups.map(async (group) => {
				const lessons = await prisma.lesson.findMany({
					where: {
						groupId: group.id,
						date: { gte: monthStart, lte: monthEnd },
						wasHeld: true,
						teacherSkipped: false,
					},
					select: { id: true },
				});

				const studentCount = group._count.students;
				const lessonsHeld = lessons.length;
				const ratePerStudent = group.teacherRate || 0;
				const earnings = ratePerStudent * studentCount * lessonsHeld;

				return {
					group: {
						id: group.id,
						name: group.name,
						course: group.course.name,
					},
					studentCount,
					lessonsHeld,
					ratePerStudent,
					earnings,
				};
			}),
		);

		const totalEarnings = groupDetails.reduce((sum, g) => sum + g.earnings, 0);

		const monthStr = `${year}-${String(month).padStart(2, "0")}`;

		const advances = await prisma.teacherPayment.aggregate({
			where: {
				teacherId,
				type: "ADVANCE",
				month: monthStr,
			},
			_sum: { amount: true },
		});

		const salaryPaid = await prisma.teacherPayment.aggregate({
			where: {
				teacherId,
				type: "SALARY",
				month: monthStr,
			},
			_sum: { amount: true },
		});

		const totalAdvances = advances._sum.amount || 0;
		const totalSalaryPaid = salaryPaid._sum.amount || 0;
		const netOwed = totalEarnings - totalAdvances - totalSalaryPaid;

		return {
			teacher,
			month: monthStr,
			groups: groupDetails,
			totalEarnings,
			totalAdvances,
			totalSalaryPaid,
			netOwed,
		};
	}
}
