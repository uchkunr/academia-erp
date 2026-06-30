import { env } from "@config/env";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import {
	buildDateRangeFilter,
	calculatePagination,
	calculateTotalPages,
} from "@lib/utils";
import type {
	CreatePaymentDto,
	CreatePricingTariffDto,
	CreateSchoolClassDto,
	CreateSubjectDto,
	CreateTeacherSubjectLevelDto,
	GetPaymentsQueryDto,
	GetPricingTariffsQueryDto,
	GetSchoolClassesQueryDto,
	GetSubjectsQueryDto,
	GetTeacherSubjectLevelsQueryDto,
	StudentSummaryQueryDto,
	UpdatePricingTariffDto,
	UpdateSchoolClassDto,
	UpdateSubjectDto,
	UpdateTeacherSubjectLevelDto,
} from "./payments.dto";

import type {
	Payment,
	PaymentListResponse,
	PaymentReceipt,
	PricingTariff,
	PricingTariffListResponse,
	SchoolClass,
	SchoolClassListResponse,
	Subject,
	SubjectListResponse,
	TeacherSubjectLevel,
	TeacherSubjectLevelListResponse,
} from "./payments.types";

export class PaymentsService {
	async calculatePrice(studentId: number, groupId: number): Promise<number> {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: { studentClass: true },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		if (!student.studentClass) {
			throw new BadRequestError("Student class is not set");
		}

		const group = await prisma.group.findUnique({
			where: { id: groupId },
			include: {
				course: {
					include: {
						subject: true,
					},
				},
				teacher: true,
			},
		});

		if (!group) {
			throw new NotFoundError("Group not found");
		}

		if (!group.course.subjectId) {
			throw new BadRequestError("Course must have an associated subject");
		}

		const teacherSubjectLevel = await prisma.teacherSubjectLevel.findUnique({
			where: {
				teacherId_subjectId: {
					teacherId: group.teacherId,
					subjectId: group.course.subjectId,
				},
			},
		});

		if (!teacherSubjectLevel) {
			throw new NotFoundError("Teacher subject level not found for this group");
		}

		const now = new Date();
		const tariff = await prisma.pricingTariff.findFirst({
			where: {
				studentClass: student.studentClass,
				teacherLevel: teacherSubjectLevel.level,
				subjectId: group.course.subjectId,
				validFrom: { lte: now },
				OR: [{ validTo: null }, { validTo: { gte: now } }],
			},
			orderBy: {
				validFrom: "desc",
			},
		});

		if (!tariff) {
			throw new NotFoundError(
				"Pricing tariff not found for this student class and teacher level",
			);
		}

		return tariff.amount;
	}

	async create(data: CreatePaymentDto): Promise<Payment> {
		const student = await prisma.student.findUnique({
			where: { id: data.studentId },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		const user = await prisma.user.findUnique({
			where: { id: data.receivedById },
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		let amount = data.amount;
		const discount = data.discount || 0;

		if (data.groupId && !amount) {
			amount = await this.calculatePrice(data.studentId, data.groupId);
		}

		if (!amount) {
			throw new BadRequestError(
				"Amount is required or groupId must be provided",
			);
		}

		if (discount > amount) {
			throw new BadRequestError("Discount cannot be greater than amount");
		}

		let paymentType: string | null = null;
		if (data.groupId) {
			const group = await prisma.group.findUnique({
				where: { id: data.groupId },
				include: { course: true },
			});
			if (group) {
				const paidAmount = amount - discount;
				if (discount > 0 || paidAmount < group.course.price) {
					paymentType = "PARTIAL";
				} else {
					paymentType = "FULL";
				}
			}
		}

		const payment = await prisma.payment.create({
			data: {
				studentId: data.studentId,
				groupId: data.groupId,
				amount,
				discount,
				method: data.method,
				receivedById: data.receivedById,
				description: data.description,
				status: "PAID",
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
				paymentType,
			},
			select: {
				id: true,
				studentId: true,
				groupId: true,
				amount: true,
				discount: true,
				method: true,
				status: true,
				receivedById: true,
				description: true,
				isCancelled: true,
				createdAt: true,
				student: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				receivedBy: {
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

		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				invoiceId: `INV-${String(payment.id).padStart(6, "0")}`,
				transactionId: `TXN${String(payment.id).padStart(10, "0")}`,
			},
		});

		await prisma.student.update({
			where: { id: data.studentId },
			data: {
				balance: {
					increment: amount,
				},
			},
		});

		return payment;
	}

	async findAll(query: GetPaymentsQueryDto): Promise<PaymentListResponse> {
		const {
			page,
			limit,
			studentId,
			groupId,
			method,
			status,
			startDate,
			endDate,
		} = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(studentId && { studentId }),
			...(groupId && { groupId }),
			...(method && { method }),
			...(status && { status }),
			...buildDateRangeFilter(startDate, endDate, "createdAt"),
		};

		const [payments, total] = await Promise.all([
			prisma.payment.findMany({
				where,
				select: {
					id: true,
					studentId: true,
					groupId: true,
					amount: true,
					discount: true,
					method: true,
					status: true,
					receivedById: true,
					description: true,
					isCancelled: true,
					createdAt: true,
					student: {
						select: {
							id: true,
							fullname: true,
							username: true,
						},
					},
					receivedBy: {
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
					createdAt: "desc",
				},
				skip,
				take,
			}),
			prisma.payment.count({ where }),
		]);

		return {
			payments,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<Payment> {
		const payment = await prisma.payment.findUnique({
			where: { id },
			select: {
				id: true,
				studentId: true,
				groupId: true,
				amount: true,
				discount: true,
				method: true,
				status: true,
				receivedById: true,
				description: true,
				isCancelled: true,
				createdAt: true,
				student: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				receivedBy: {
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

		if (!payment) {
			throw new NotFoundError("Payment not found");
		}

		return payment;
	}

	async getReceipt(id: number): Promise<PaymentReceipt> {
		const payment = await prisma.payment.findUnique({
			where: { id },
			include: {
				student: {
					select: {
						id: true,
						fullname: true,
						username: true,
						phone: true,
					},
				},
				group: {
					include: {
						course: {
							select: { id: true, name: true, price: true },
						},
						teacher: {
							select: { id: true, fullname: true },
						},
					},
				},
				receivedBy: {
					select: { id: true, fullname: true, username: true },
				},
			},
		});

		if (!payment) {
			throw new NotFoundError("Payment not found");
		}

		const paymentHistory = await prisma.payment.findMany({
			where: {
				studentId: payment.studentId,
				groupId: payment.groupId,
				isCancelled: false,
			},
			select: {
				id: true,
				amount: true,
				discount: true,
				method: true,
				status: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
		});

		const paidAmount = payment.amount - payment.discount;

		const totalPaid = paymentHistory.reduce(
			(sum, p) => sum + (p.amount - p.discount),
			0,
		);
		const coursePrice = payment.group?.course.price ?? 0;
		const remainingBalance = Math.max(0, coursePrice - totalPaid);

		return {
			id: payment.id,
			invoiceId: payment.invoiceId,
			transactionId: payment.transactionId,
			amount: payment.amount,
			discount: payment.discount,
			paidAmount,
			remainingBalance,
			method: payment.method,
			paymentType: payment.paymentType,
			status: payment.status,
			isCancelled: payment.isCancelled,
			description: payment.description,
			createdAt: payment.createdAt,
			periodStart: payment.periodStart,
			periodEnd: payment.periodEnd,
			student: payment.student,
			group: payment.group
				? {
						id: payment.group.id,
						name: payment.group.name,
						course: payment.group.course,
					}
				: null,
			teacher: payment.group?.teacher ?? null,
			receivedBy: payment.receivedBy,
			branch: env.BRANCH_NAME,
			paymentHistory: paymentHistory.map((p) => ({
				id: p.id,
				amount: p.amount,
				discount: p.discount,
				paidAmount: p.amount - p.discount,
				method: p.method,
				status: p.status,
				createdAt: p.createdAt,
			})),
		};
	}

	async cancel(id: number, userId: number): Promise<Payment> {
		const payment = await prisma.payment.findUnique({
			where: { id },
		});

		if (!payment) {
			throw new NotFoundError("Payment not found");
		}

		if (payment.isCancelled) {
			throw new BadRequestError("Payment is already cancelled");
		}

		const [updatedPayment] = await prisma.$transaction([
			prisma.payment.update({
				where: { id },
				data: {
					isCancelled: true,
					status: "CANCELLED",
				},
				select: {
					id: true,
					studentId: true,
					groupId: true,
					amount: true,
					discount: true,
					method: true,
					status: true,
					receivedById: true,
					description: true,
					isCancelled: true,
					createdAt: true,
					student: {
						select: {
							id: true,
							fullname: true,
							username: true,
						},
					},
					receivedBy: {
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
			}),
			prisma.student.update({
				where: { id: payment.studentId },
				data: {
					balance: {
						decrement: payment.amount,
					},
				},
			}),
			prisma.auditLog.create({
				data: {
					userId,
					action: "PAYMENT_CANCELLED",
					table: "Payment",
					recordId: id,
					oldValue: payment,
					newValue: { ...payment, isCancelled: true, status: "CANCELLED" },
				},
			}),
		]);

		return updatedPayment;
	}

	async createSubject(data: CreateSubjectDto): Promise<Subject> {
		const existingSubject = await prisma.subject.findUnique({
			where: { name: data.name },
		});

		if (existingSubject) {
			throw new ConflictError("Subject with this name already exists");
		}

		const subject = await prisma.subject.create({
			data: {
				name: data.name,
			},
		});

		return subject;
	}

	async findAllSubjects(
		query: GetSubjectsQueryDto,
	): Promise<SubjectListResponse> {
		const { page, limit, search, isActive } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(search && {
				name: { contains: search, mode: "insensitive" as const },
			}),
			...(isActive !== undefined && { isActive }),
		};

		const [subjects, total] = await Promise.all([
			prisma.subject.findMany({
				where,
				orderBy: {
					name: "asc",
				},
				skip,
				take,
			}),
			prisma.subject.count({ where }),
		]);

		return {
			subjects,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findSubjectById(id: number): Promise<Subject> {
		const subject = await prisma.subject.findUnique({
			where: { id },
		});

		if (!subject) {
			throw new NotFoundError("Subject not found");
		}

		return subject;
	}

	async updateSubject(id: number, data: UpdateSubjectDto): Promise<Subject> {
		const subject = await prisma.subject.findUnique({
			where: { id },
		});

		if (!subject) {
			throw new NotFoundError("Subject not found");
		}

		if (data.name && data.name !== subject.name) {
			const existingSubject = await prisma.subject.findUnique({
				where: { name: data.name },
			});

			if (existingSubject) {
				throw new ConflictError("Subject with this name already exists");
			}
		}

		const updatedSubject = await prisma.subject.update({
			where: { id },
			data,
		});

		return updatedSubject;
	}

	async createPricingTariff(
		data: CreatePricingTariffDto,
	): Promise<PricingTariff> {
		if (data.subjectId) {
			const subject = await prisma.subject.findUnique({
				where: { id: data.subjectId },
			});

			if (!subject) {
				throw new NotFoundError("Subject not found");
			}
		}

		const validFrom = data.validFrom || new Date();

		const existingTariff = await prisma.pricingTariff.findFirst({
			where: {
				studentClass: data.studentClass,
				teacherLevel: data.teacherLevel,
				subjectId: data.subjectId || null,
				validFrom,
			},
		});

		if (existingTariff) {
			throw new ConflictError(
				"Pricing tariff with these parameters already exists",
			);
		}

		const tariff = await prisma.pricingTariff.create({
			data: {
				studentClass: data.studentClass,
				teacherLevel: data.teacherLevel,
				amount: data.amount,
				subjectId: data.subjectId,
				validFrom,
				validTo: data.validTo,
			},
			include: {
				subject: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		return tariff;
	}

	async findAllPricingTariffs(
		query: GetPricingTariffsQueryDto,
	): Promise<PricingTariffListResponse> {
		const { page, limit, studentClass, teacherLevel, subjectId } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(studentClass && { studentClass }),
			...(teacherLevel && { teacherLevel }),
			...(subjectId && { subjectId }),
		};

		const [tariffs, total] = await Promise.all([
			prisma.pricingTariff.findMany({
				where,
				include: {
					subject: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: [
					{ studentClass: "asc" },
					{ teacherLevel: "asc" },
					{ validFrom: "desc" },
				],
				skip,
				take,
			}),
			prisma.pricingTariff.count({ where }),
		]);

		return {
			tariffs,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findPricingTariffById(id: number): Promise<PricingTariff> {
		const tariff = await prisma.pricingTariff.findUnique({
			where: { id },
			include: {
				subject: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!tariff) {
			throw new NotFoundError("Pricing tariff not found");
		}

		return tariff;
	}

	async updatePricingTariff(
		id: number,
		data: UpdatePricingTariffDto,
	): Promise<PricingTariff> {
		const tariff = await prisma.pricingTariff.findUnique({
			where: { id },
		});

		if (!tariff) {
			throw new NotFoundError("Pricing tariff not found");
		}

		if (data.subjectId !== undefined && data.subjectId !== null) {
			const subject = await prisma.subject.findUnique({
				where: { id: data.subjectId },
			});

			if (!subject) {
				throw new NotFoundError("Subject not found");
			}
		}

		const updatedTariff = await prisma.pricingTariff.update({
			where: { id },
			data,
			include: {
				subject: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		return updatedTariff;
	}

	async createTeacherSubjectLevel(
		data: CreateTeacherSubjectLevelDto,
	): Promise<TeacherSubjectLevel> {
		const teacher = await prisma.user.findUnique({
			where: { id: data.teacherId },
		});

		if (!teacher) {
			throw new NotFoundError("Teacher not found");
		}

		const subject = await prisma.subject.findUnique({
			where: { id: data.subjectId },
		});

		if (!subject) {
			throw new NotFoundError("Subject not found");
		}

		const level = await prisma.teacherSubjectLevel.upsert({
			where: {
				teacherId_subjectId: {
					teacherId: data.teacherId,
					subjectId: data.subjectId,
				},
			},
			update: {
				level: data.level,
			},
			create: {
				teacherId: data.teacherId,
				subjectId: data.subjectId,
				level: data.level,
			},
			include: {
				teacher: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				subject: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		return level;
	}

	async findAllTeacherSubjectLevels(
		query: GetTeacherSubjectLevelsQueryDto,
	): Promise<TeacherSubjectLevelListResponse> {
		const { page, limit, teacherId, subjectId, level } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(teacherId && { teacherId }),
			...(subjectId && { subjectId }),
			...(level && { level }),
		};

		const [levels, total] = await Promise.all([
			prisma.teacherSubjectLevel.findMany({
				where,
				include: {
					teacher: {
						select: {
							id: true,
							fullname: true,
							username: true,
						},
					},
					subject: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: [{ teacherId: "asc" }, { subjectId: "asc" }],
				skip,
				take,
			}),
			prisma.teacherSubjectLevel.count({ where }),
		]);

		return {
			levels,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findTeacherSubjectLevelById(id: number): Promise<TeacherSubjectLevel> {
		const level = await prisma.teacherSubjectLevel.findUnique({
			where: { id },
			include: {
				teacher: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				subject: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!level) {
			throw new NotFoundError("Teacher subject level not found");
		}

		return level;
	}

	async updateTeacherSubjectLevel(
		id: number,
		data: UpdateTeacherSubjectLevelDto,
	): Promise<TeacherSubjectLevel> {
		const level = await prisma.teacherSubjectLevel.findUnique({
			where: { id },
		});

		if (!level) {
			throw new NotFoundError("Teacher subject level not found");
		}

		const updatedLevel = await prisma.teacherSubjectLevel.update({
			where: { id },
			data,
			include: {
				teacher: {
					select: {
						id: true,
						fullname: true,
						username: true,
					},
				},
				subject: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		return updatedLevel;
	}

	async deleteTeacherSubjectLevel(id: number): Promise<void> {
		const level = await prisma.teacherSubjectLevel.findUnique({
			where: { id },
		});

		if (!level) {
			throw new NotFoundError("Teacher subject level not found");
		}

		const activeGroups = await prisma.group.findMany({
			where: {
				teacherId: level.teacherId,
				isActive: true,
				course: {
					subjectId: level.subjectId,
				},
			},
			select: { id: true },
		});

		if (activeGroups.length > 0) {
			throw new BadRequestError(
				"This teacher has active groups for this subject. Remove them from the groups first.",
			);
		}

		await prisma.teacherSubjectLevel.delete({
			where: { id },
		});
	}

	async createSchoolClass(data: CreateSchoolClassDto): Promise<SchoolClass> {
		const existingClass = await prisma.schoolClass.findUnique({
			where: { name: data.name },
		});

		if (existingClass) {
			throw new ConflictError("School class with this name already exists");
		}

		const schoolClass = await prisma.schoolClass.create({
			data: {
				name: data.name,
				price: data.price,
				teacherShareL1: data.teacherShareL1,
				teacherShareL2: data.teacherShareL2,
				teacherShareL3: data.teacherShareL3,
				teacherShareL4: data.teacherShareL4,
			},
		});

		return schoolClass;
	}

	async findAllSchoolClasses(
		query: GetSchoolClassesQueryDto,
	): Promise<SchoolClassListResponse> {
		const { page, limit, search, isActive } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(search && {
				name: { contains: search, mode: "insensitive" as const },
			}),
			...(isActive !== undefined && { isActive }),
		};

		const [schoolClasses, total] = await Promise.all([
			prisma.schoolClass.findMany({
				where,
				orderBy: {
					name: "asc",
				},
				skip,
				take,
			}),
			prisma.schoolClass.count({ where }),
		]);

		return {
			schoolClasses,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findSchoolClassById(id: number): Promise<SchoolClass> {
		const schoolClass = await prisma.schoolClass.findUnique({
			where: { id },
		});

		if (!schoolClass) {
			throw new NotFoundError("School class not found");
		}

		return schoolClass;
	}

	async updateSchoolClass(
		id: number,
		data: UpdateSchoolClassDto,
	): Promise<SchoolClass> {
		const schoolClass = await prisma.schoolClass.findUnique({
			where: { id },
		});

		if (!schoolClass) {
			throw new NotFoundError("School class not found");
		}

		if (data.name && data.name !== schoolClass.name) {
			const existingClass = await prisma.schoolClass.findUnique({
				where: { name: data.name },
			});

			if (existingClass) {
				throw new ConflictError("School class with this name already exists");
			}
		}

		const updatedClass = await prisma.schoolClass.update({
			where: { id },
			data,
		});

		return updatedClass;
	}

	async deleteSchoolClass(id: number): Promise<void> {
		const schoolClass = await prisma.schoolClass.findUnique({
			where: { id },
		});

		if (!schoolClass) {
			throw new NotFoundError("School class not found");
		}

		await prisma.schoolClass.update({
			where: { id },
			data: { isActive: false },
		});
	}

	async getStudentSummary(query: StudentSummaryQueryDto) {
		const { studentId, groupId } = query;
		const year = query.year || new Date().getFullYear();

		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: { id: true, fullname: true, username: true, balance: true },
		});

		if (!student) {
			throw new NotFoundError("Student not found");
		}

		const studentGroups = await prisma.studentGroup.findMany({
			where: {
				studentId,
				...(groupId && { groupId }),
			},
			select: {
				groupId: true,
				joinedAt: true,
				group: {
					select: {
						id: true,
						name: true,
						isActive: true,
						course: {
							select: {
								name: true,
								price: true,
							},
						},
					},
				},
			},
		});

		const now = new Date();
		const groups = [];

		for (const sg of studentGroups) {
			const monthlyPrice = sg.group.course.price;

			const payments = await prisma.payment.findMany({
				where: {
					studentId,
					groupId: sg.groupId,
					isCancelled: false,
				},
				select: {
					id: true,
					amount: true,
					discount: true,
					method: true,
					periodStart: true,
					periodEnd: true,
					createdAt: true,
				},
				orderBy: { createdAt: "asc" },
			});

			const joinDate = new Date(sg.joinedAt);
			const startMonth =
				joinDate.getFullYear() === year
					? joinDate.getMonth()
					: joinDate.getFullYear() < year
						? 0
						: 12;
			const endMonth =
				now.getFullYear() === year
					? now.getMonth()
					: year < now.getFullYear()
						? 11
						: -1;

			if (startMonth > 11 || endMonth < 0) {
				continue;
			}

			const months = [];
			let totalPaid = 0;
			let totalDebt = 0;

			for (let m = startMonth; m <= endMonth; m++) {
				const monthStr = `${year}-${String(m + 1).padStart(2, "0")}`;
				const monthStart = new Date(year, m, 1);
				const monthEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);

				const monthPayments = payments.filter((p) => {
					if (p.periodStart) {
						const ps = new Date(p.periodStart);
						return ps >= monthStart && ps <= monthEnd;
					}
					const cd = new Date(p.createdAt);
					return cd >= monthStart && cd <= monthEnd;
				});

				const paidAmount = monthPayments.reduce(
					(sum, p) => sum + (p.amount - p.discount),
					0,
				);
				const debt = Math.max(0, monthlyPrice - paidAmount);

				let status: "PAID" | "PARTIAL" | "DEBT" = "DEBT";
				if (paidAmount >= monthlyPrice) {
					status = "PAID";
				} else if (paidAmount > 0) {
					status = "PARTIAL";
				}

				totalPaid += paidAmount;
				totalDebt += debt;

				months.push({
					month: monthStr,
					expectedAmount: monthlyPrice,
					paidAmount,
					debt,
					status,
					payments: monthPayments.map((p) => ({
						id: p.id,
						amount: p.amount,
						discount: p.discount,
						method: p.method,
						date: p.createdAt,
					})),
				});
			}

			groups.push({
				group: {
					id: sg.group.id,
					name: sg.group.name,
					course: sg.group.course.name,
				},
				monthlyPrice,
				months,
				totalPaid,
				totalDebt,
			});
		}

		return { student, groups };
	}
}
