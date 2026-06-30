export type Grade = {
	id: number;
	studentId: number;
	groupId: number | null;
	subject: string;
	score: number;
	comment: string | null;
	date: Date;
	student: {
		id: number;
		fullname: string;
		username: string;
	};
	group: {
		id: number;
		name: string;
	} | null;
};

export type GradeListResponse = {
	grades: Grade[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type StudentGradeStats = {
	studentId: number;
	studentName: string;
	totalGrades: number;
	averageScore: number;
	highestScore: number;
	lowestScore: number;
	subjects: {
		subject: string;
		averageScore: number;
		gradeCount: number;
	}[];
};
