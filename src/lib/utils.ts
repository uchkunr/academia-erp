import { BadRequestError } from "./http-errors";

export const parseId = (id: string, name: string): number => {
	const parsed = Number.parseInt(id, 10);
	if (Number.isNaN(parsed)) {
		throw new BadRequestError(`Invalid ${name} ID`);
	}
	return parsed;
};

export const calculatePagination = (page: number, limit: number) => ({
	skip: (page - 1) * limit,
	take: limit,
});

export const calculateTotalPages = (total: number, limit: number) =>
	Math.ceil(total / limit);

export const buildDateRangeFilter = (
	startDate?: string | Date,
	endDate?: string | Date,
	field = "createdAt",
) => {
	if (!startDate && !endDate) return {};

	const start =
		startDate instanceof Date
			? startDate
			: startDate
				? new Date(startDate)
				: undefined;
	const end =
		endDate instanceof Date ? endDate : endDate ? new Date(endDate) : undefined;

	return {
		[field]: {
			...(start && { gte: start }),
			...(end && { lte: end }),
		},
	};
};

export const groupPaymentsByMethod = (
	payments: Array<{ method: string; amount: number }>,
) => {
	return Object.entries(
		payments.reduce(
			(acc, p) => {
				if (!acc[p.method]) {
					acc[p.method] = { amount: 0, count: 0 };
				}
				acc[p.method].amount += p.amount;
				acc[p.method].count += 1;
				return acc;
			},
			{} as Record<string, { amount: number; count: number }>,
		),
	).map(([method, data]) => ({
		method,
		amount: data.amount,
		count: data.count,
	}));
};

export const buildDateRangeFilterForLesson = (
	dateFrom?: string | Date,
	dateTo?: string | Date,
) => {
	if (!dateFrom && !dateTo) return {};

	const start =
		dateFrom instanceof Date
			? dateFrom
			: dateFrom
				? new Date(dateFrom)
				: undefined;
	const end =
		dateTo instanceof Date ? dateTo : dateTo ? new Date(dateTo) : undefined;

	if (start && end) {
		return {
			date: {
				gte: start,
				lte: end,
			},
		};
	}

	if (start) {
		return {
			date: {
				gte: start,
			},
		};
	}

	if (end) {
		return {
			date: {
				lte: end,
			},
		};
	}

	return {};
};
