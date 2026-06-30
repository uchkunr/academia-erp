export type Course = {
	id: number;
	name: string;
	price: number;
	subjectId: number | null;
	isActive: boolean;
};

export type CourseListResponse = {
	courses: Course[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};
