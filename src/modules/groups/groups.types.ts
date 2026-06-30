export type GroupSchedule = {
	days: number[];
	time?: string;
	startTime?: string;
	endTime?: string;
};

export type GroupStudent = {
	id: number;
	studentId: number;
	discount: number;
	joinedAt: Date;
	student: {
		id: number;
		fullname: string;
		username: string;
		phone: string | null;
	};
};

export type Group = {
	id: number;
	name: string;
	courseId: number;
	teacherId: number;
	teacherRate: number | null;
	schedule: GroupSchedule;
	roomNumber: string | null;
	paymentDay: number | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type GroupWithRelations = Group & {
	course: {
		id: number;
		name: string;
		price: number;
	};
	teacher: {
		id: number;
		fullname: string;
		username: string;
	};
	_count: {
		students: number;
	};
};

export type GroupWithStudents = GroupWithRelations & {
	students: GroupStudent[];
};

export type GroupListResponse = {
	groups: GroupWithRelations[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};
