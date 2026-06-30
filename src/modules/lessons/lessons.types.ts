export type Lesson = {
	id: number;
	groupId: number;
	date: Date;
	wasHeld: boolean;
	teacherSkipped: boolean;
};

export type LessonWithRelations = Lesson & {
	group: {
		id: number;
		name: string;
		teacher: {
			id: number;
			fullname: string;
		};
	};
	_count: {
		attendance: number;
	};
};

export type LessonListResponse = {
	lessons: LessonWithRelations[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};
