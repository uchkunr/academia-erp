import { ForbiddenError } from "@lib/http-errors";
import { parseId } from "@lib/utils";
import { Elysia } from "elysia";
import {
	type CreateCashHandoverDto,
	type CreateTeacherPaymentDto,
	createCashHandoverDto,
	createTeacherPaymentDto,
	type GetCashHandoversQueryDto,
	type GetTeacherPaymentsQueryDto,
	getCashHandoversQueryDto,
	getTeacherPaymentsQueryDto,
	type TeacherSalaryQueryDto,
	teacherSalaryQueryDto,
} from "./finance.dto";
import { FinanceService } from "./finance.service";

const financeService = new FinanceService();

export const financeController = new Elysia({ prefix: "/finance" })
	.get(
		"/cash-balances",
		// @ts-expect-error user is injected by authMacro
		async ({ user }) => {
			if (user.role !== "OWNER") {
				throw new ForbiddenError("Only OWNER can view cash balances");
			}
			const balances = await financeService.getCashBalances();
			return { data: balances };
		},
		{
			detail: {
				tags: ["Finance"],
				summary: "Get cash balances for all cashiers/admins",
				description:
					"Returns cash balance for each cashier and admin. Shows total collected, handed over, pending, and current balance.",
			},
		},
	)
	.get(
		"/my-balance",
		// @ts-expect-error user is injected by authMacro
		async ({ user }) => {
			if (user.role !== "CASHIER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only CASHIER and ADMIN can view their balance",
				);
			}
			const balance = await financeService.getMyBalance(user.userId);
			return { data: balance };
		},
		{
			detail: {
				tags: ["Finance"],
				summary: "Get my cash balance",
				description:
					"Returns the current user's cash balance including total collected, handed over, and pending amounts.",
			},
		},
	)
	.post(
		"/cash-handovers",
		// @ts-expect-error user is injected by authMacro
		async ({ body, user, set }) => {
			if (user.role !== "CASHIER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only CASHIER and ADMIN can create cash handovers",
				);
			}
			const validatedBody = createCashHandoverDto.parse(
				body,
			) as CreateCashHandoverDto;
			const handover = await financeService.createCashHandover(
				validatedBody,
				user.userId,
			);
			set.status = 201;
			return { data: handover };
		},
		{
			body: createCashHandoverDto,
			detail: {
				tags: ["Finance"],
				summary: "Create a cash handover request",
				description:
					"Creates a new cash handover request from cashier/admin to owner. Amount cannot exceed current balance.",
			},
		},
	)
	.get(
		"/cash-handovers",
		async ({ query }) => {
			const validatedQuery = getCashHandoversQueryDto.parse(
				query,
			) as GetCashHandoversQueryDto;
			const result = await financeService.getCashHandovers(validatedQuery);
			return { data: result };
		},
		{
			query: getCashHandoversQueryDto,
			detail: {
				tags: ["Finance"],
				summary: "Get list of cash handovers",
				description:
					"Retrieves a paginated list of cash handovers with optional filtering by status, user, and date range.",
			},
		},
	)
	.patch(
		"/cash-handovers/:id/approve",
		// @ts-expect-error user is injected by authMacro
		async ({ params, user }) => {
			if (user.role !== "OWNER") {
				throw new ForbiddenError("Only OWNER can approve handovers");
			}
			const id = parseId(params.id, "handover");
			const handover = await financeService.approveHandover(id);
			return { data: handover };
		},
		{
			detail: {
				tags: ["Finance"],
				summary: "Approve a cash handover",
				description:
					"Approves a pending cash handover request. Only the owner can approve.",
			},
		},
	)
	.patch(
		"/cash-handovers/:id/reject",
		// @ts-expect-error user is injected by authMacro
		async ({ params, user }) => {
			if (user.role !== "OWNER") {
				throw new ForbiddenError("Only OWNER can reject handovers");
			}
			const id = parseId(params.id, "handover");
			const handover = await financeService.rejectHandover(id);
			return { data: handover };
		},
		{
			detail: {
				tags: ["Finance"],
				summary: "Reject a cash handover",
				description:
					"Rejects a pending cash handover request. Only the owner can reject.",
			},
		},
	)
	.post(
		"/teacher-payments",
		// @ts-expect-error user is injected by authMacro
		async ({ body, user, set }) => {
			if (user.role !== "OWNER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only OWNER and ADMIN can create teacher payments",
				);
			}
			const validatedBody = createTeacherPaymentDto.parse(
				body,
			) as CreateTeacherPaymentDto;
			const payment = await financeService.createTeacherPayment(
				validatedBody,
				user.userId,
			);
			set.status = 201;
			return { data: payment };
		},
		{
			body: createTeacherPaymentDto,
			detail: {
				tags: ["Finance"],
				summary: "Create a teacher payment",
				description:
					"Records a salary or advance payment to a teacher. Only OWNER and ADMIN can create.",
			},
		},
	)
	.get(
		"/teacher-payments",
		// @ts-expect-error user is injected by authMacro
		async ({ query, user }) => {
			if (user.role !== "OWNER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only OWNER and ADMIN can view teacher payments",
				);
			}
			const validatedQuery = getTeacherPaymentsQueryDto.parse(
				query,
			) as GetTeacherPaymentsQueryDto;
			const result = await financeService.getTeacherPayments(validatedQuery);
			return { data: result };
		},
		{
			query: getTeacherPaymentsQueryDto,
			detail: {
				tags: ["Finance"],
				summary: "Get list of teacher payments",
				description:
					"Retrieves a paginated list of teacher payments with optional filtering by teacher, type, and month.",
			},
		},
	)
	.get(
		"/teacher-salary/:teacherId",
		// @ts-expect-error user is injected by authMacro
		async ({ params, query, user }) => {
			if (user.role !== "OWNER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only OWNER and ADMIN can view teacher salary",
				);
			}
			const teacherId = parseId(params.teacherId, "teacher");
			const validatedQuery = teacherSalaryQueryDto.parse(
				query,
			) as TeacherSalaryQueryDto;
			const result = await financeService.getTeacherSalary(
				teacherId,
				validatedQuery,
			);
			return { data: result };
		},
		{
			query: teacherSalaryQueryDto,
			detail: {
				tags: ["Finance"],
				summary: "Get teacher salary calculation",
				description:
					"Calculates teacher's monthly salary based on groups, student count, lessons held, and deducts advances already paid.",
			},
		},
	);
