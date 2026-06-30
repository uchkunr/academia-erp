export type DailyRevenueReport = {
	date: string;
	totalRevenue: number;
	paymentCount: number;
	paymentsByMethod: {
		method: string;
		amount: number;
		count: number;
	}[];
};

export type MonthlyRevenueReport = {
	month: string;
	totalRevenue: number;
	paymentCount: number;
	paymentsByMethod: {
		method: string;
		amount: number;
		count: number;
	}[];
	dailyBreakdown: {
		date: string;
		amount: number;
		count: number;
	}[];
};

export type DebtorsReport = {
	students: {
		id: number;
		fullname: string;
		phone: string | null;
		status: string;
		balance: number;
		groups: {
			id: number;
			name: string;
			course: {
				name: string;
				price: number;
			};
		}[];
		lastPayment: {
			date: string;
			amount: number;
		} | null;
	}[];
	totalDebt: number;
	debtorCount: number;
};

export type GroupProfitabilityReport = {
	groups: {
		id: number;
		name: string;
		course: {
			name: string;
			price: number;
		};
		teacher: {
			fullname: string;
		};
		teacherRate: number;
		studentCount: number;
		monthlyRevenue: number;
		teacherCost: number;
		profit: number;
		profitMargin: number;
	}[];
	totalRevenue: number;
	totalTeacherCost: number;
	totalProfit: number;
};

export type TeacherPerformanceReport = {
	teachers: {
		id: number;
		fullname: string;
		groups: {
			id: number;
			name: string;
			studentCount: number;
			attendanceRate: number;
			revenue: number;
			teacherRate: number;
			earnings: number;
			subject: { id: number; name: string } | null;
			teacherLevel: string | null;
		}[];
		totalStudents: number;
		totalRevenue: number;
		totalEarnings: number;
		averageAttendance: number;
	}[];
};

export type CenterProfitReport = {
	period: {
		from: string;
		to: string;
	};
	totalRevenue: number;
	totalTeacherCosts: number;
	totalProfit: number;
	profitMargin: number;
	studentCount: number;
	activeGroups: number;
	revenueByMonth: {
		month: string;
		revenue: number;
		costs: number;
		profit: number;
	}[];
};
