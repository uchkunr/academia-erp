import type {
	PaymentMethod,
	PaymentStatus,
	StudentClass,
	TeacherLevel,
} from "@generated/prisma/client";

export type Payment = {
	id: number;
	studentId: number;
	groupId: number | null;
	amount: number;
	discount: number;
	method: PaymentMethod;
	status: PaymentStatus;
	receivedById: number;
	description: string | null;
	isCancelled: boolean;
	createdAt: Date;
	student: {
		id: number;
		fullname: string;
		username: string;
	};
	receivedBy: {
		id: number;
		fullname: string;
		username: string;
	};
	group?: {
		id: number;
		name: string;
	} | null;
};

export type PaymentReceipt = {
	id: number;
	invoiceId: string | null;
	transactionId: string | null;
	amount: number;
	discount: number;
	paidAmount: number;
	remainingBalance: number;
	method: PaymentMethod;
	paymentType: string | null;
	status: PaymentStatus;
	isCancelled: boolean;
	description: string | null;
	createdAt: Date;
	periodStart: Date | null;
	periodEnd: Date | null;
	student: {
		id: number;
		fullname: string;
		username: string;
		phone: string | null;
	};
	group: {
		id: number;
		name: string;
		course: { id: number; name: string; price: number };
	} | null;
	teacher: { id: number; fullname: string } | null;
	receivedBy: { id: number; fullname: string; username: string };
	branch: string;
	paymentHistory: {
		id: number;
		amount: number;
		discount: number;
		paidAmount: number;
		method: PaymentMethod;
		status: PaymentStatus;
		createdAt: Date;
	}[];
};

export type PaymentListResponse = {
	payments: Payment[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type Subject = {
	id: number;
	name: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type SubjectListResponse = {
	subjects: Subject[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type PricingTariff = {
	id: number;
	studentClass: StudentClass;
	teacherLevel: TeacherLevel;
	amount: number;
	validFrom: Date;
	validTo: Date | null;
	subjectId: number | null;
	subject?: {
		id: number;
		name: string;
	} | null;
	createdAt: Date;
	updatedAt: Date;
};

export type PricingTariffListResponse = {
	tariffs: PricingTariff[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type TeacherSubjectLevel = {
	id: number;
	teacherId: number;
	subjectId: number;
	level: TeacherLevel;
	createdAt: Date;
	updatedAt: Date;
	teacher: {
		id: number;
		fullname: string;
		username: string;
	};
	subject: {
		id: number;
		name: string;
	};
};

export type TeacherSubjectLevelListResponse = {
	levels: TeacherSubjectLevel[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type SchoolClass = {
	id: number;
	name: string;
	price: number;
	teacherShareL1: number;
	teacherShareL2: number;
	teacherShareL3: number;
	teacherShareL4: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type SchoolClassListResponse = {
	schoolClasses: SchoolClass[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};
