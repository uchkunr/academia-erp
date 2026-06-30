export type Attendance = {
	id: number;
	lessonId: number;
	studentId: number | null;
	userId: number | null;
	isPresent: boolean;
	timestamp: Date;
	source: "MANUAL" | "HIKVISION";
	deviceLogId: number | null;
	lesson: {
		id: number;
		date: Date;
		group: {
			id: number;
			name: string;
		};
	};
	student?: {
		id: number;
		fullname: string;
		username: string;
	} | null;
	user?: {
		id: number;
		fullname: string;
		username: string;
	} | null;
};

export type AttendanceListResponse = {
	attendances: Attendance[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type StaffAttendanceRecord = {
	user: { id: number; fullname: string; username: string; role: string };
	date: string;
	checkIn: Date | null;
	checkOut: Date | null;
	totalLogs: number;
	logs: { id: number; timestamp: Date; direction: string }[];
};

export type StaffAttendanceListResponse = {
	items: StaffAttendanceRecord[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type LessonAttendanceStats = {
	lessonId: number;
	date: Date;
	groupName: string;
	totalStudents: number;
	presentCount: number;
	absentCount: number;
	attendanceRate: number;
};
