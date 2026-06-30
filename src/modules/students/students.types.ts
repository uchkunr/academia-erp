import type { StudentClass, StudentStatus } from "@generated/prisma/client";

export type StudentGroup = {
	id: number;
	groupId: number;
	discount: number;
	joinedAt: Date;
	group: {
		id: number;
		name: string;
		course: {
			id: number;
			name: string;
		};
	};
};

export type StudentSchoolClass = {
	id: number;
	name: string;
	price: number;
};

export type Student = {
	id: number;
	fullname: string;
	phone: string | null;
	username: string;
	status: StudentStatus;
	balance: number;
	studentClass: StudentClass | null;
	schoolClass: StudentSchoolClass | null;
	groups: StudentGroup[];
	externalId: string | null;
	faceImage: string | null;
	syncedToDevice: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type StudentListResponse = {
	students: Student[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};
