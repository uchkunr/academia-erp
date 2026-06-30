import { ForbiddenError } from "@lib/http-errors";
import { parseId } from "@lib/utils";
import { Elysia } from "elysia";
import {
	type CancelPaymentDto,
	type CreatePaymentDto,
	type CreatePricingTariffDto,
	type CreateSchoolClassDto,
	type CreateSubjectDto,
	type CreateTeacherSubjectLevelDto,
	cancelPaymentDto,
	createPaymentDto,
	createPricingTariffDto,
	createSchoolClassDto,
	createSubjectDto,
	createTeacherSubjectLevelDto,
	type GetPaymentsQueryDto,
	type GetPricingTariffsQueryDto,
	type GetSchoolClassesQueryDto,
	type GetSubjectsQueryDto,
	type GetTeacherSubjectLevelsQueryDto,
	getPaymentsQueryDto,
	getPricingTariffsQueryDto,
	getSchoolClassesQueryDto,
	getSubjectsQueryDto,
	getTeacherSubjectLevelsQueryDto,
	type StudentSummaryQueryDto,
	studentSummaryQueryDto,
	type UpdatePricingTariffDto,
	type UpdateSchoolClassDto,
	type UpdateSubjectDto,
	type UpdateTeacherSubjectLevelDto,
	updatePricingTariffDto,
	updateSchoolClassDto,
	updateSubjectDto,
	updateTeacherSubjectLevelDto,
} from "./payments.dto";
import { PaymentsService } from "./payments.service";

const paymentsService = new PaymentsService();

export const paymentsController = new Elysia({ prefix: "/payments" })
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createPaymentDto.parse(body) as CreatePaymentDto;
			const payment = await paymentsService.create(validatedBody);
			set.status = 201;
			return { data: payment };
		},
		{
			body: createPaymentDto,
			detail: {
				tags: ["Payments"],
				summary: "Create a payment record",
				description:
					"Records a payment made by a student. If groupId is provided, the amount will be calculated automatically based on student class and teacher level. Otherwise, amount must be provided. The payment amount will be added to the student's balance.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getPaymentsQueryDto.parse(
				query,
			) as GetPaymentsQueryDto;
			const result = await paymentsService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getPaymentsQueryDto,
			detail: {
				tags: ["Payments"],
				summary: "Get list of payments",
				description:
					"Retrieves a paginated list of payments with optional filtering by student, group, payment method, status, and date range.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "payment");
			const payment = await paymentsService.findById(id);
			return { data: payment };
		},
		{
			detail: {
				tags: ["Payments"],
				summary: "Get payment by ID",
				description:
					"Retrieves detailed information about a specific payment including student details and the staff member who received it.",
			},
		},
	)
	.post(
		"/:id/cancel",
		async ({ params, body }) => {
			const id = parseId(params.id, "payment");

			const validatedBody = cancelPaymentDto.parse(body) as CancelPaymentDto;

			const payment = await paymentsService.cancel(id, validatedBody.userId);
			return { data: payment };
		},
		{
			body: cancelPaymentDto,
			detail: {
				tags: ["Payments"],
				summary: "Cancel a payment",
				description:
					"Cancels a payment and reverses the transaction. The payment amount will be deducted from the student's balance. This action is logged in the audit trail. Payments cannot be deleted, only cancelled.",
			},
		},
	)
	.get(
		"/student-summary",
		async ({ query }) => {
			const validatedQuery = studentSummaryQueryDto.parse(
				query,
			) as StudentSummaryQueryDto;
			const result = await paymentsService.getStudentSummary(validatedQuery);
			return { data: result };
		},
		{
			query: studentSummaryQueryDto,
			detail: {
				tags: ["Payments"],
				summary: "Get student payment summary",
				description:
					"Returns a monthly payment breakdown for a student per group. Shows which months are paid, partial, or have debt. Useful for cashiers to see payment history and outstanding balances.",
			},
		},
	)
	.post(
		"/subjects",
		async ({ body, set }) => {
			const validatedBody = createSubjectDto.parse(body) as CreateSubjectDto;
			const subject = await paymentsService.createSubject(validatedBody);
			set.status = 201;
			return { data: subject };
		},
		{
			body: createSubjectDto,
			detail: {
				tags: ["Payments"],
				summary: "Create a subject",
				description: "Creates a new subject (fan) in the system.",
			},
		},
	)
	.get(
		"/subjects",
		async ({ query }) => {
			const validatedQuery = getSubjectsQueryDto.parse(
				query,
			) as GetSubjectsQueryDto;
			const result = await paymentsService.findAllSubjects(validatedQuery);
			return { data: result };
		},
		{
			query: getSubjectsQueryDto,
			detail: {
				tags: ["Payments"],
				summary: "Get list of subjects",
				description:
					"Retrieves a paginated list of subjects with optional filtering by name and active status.",
			},
		},
	)
	.get(
		"/subjects/:id",
		async ({ params }) => {
			const id = parseId(params.id, "subject");
			const subject = await paymentsService.findSubjectById(id);
			return { data: subject };
		},
		{
			detail: {
				tags: ["Payments"],
				summary: "Get subject by ID",
				description: "Retrieves detailed information about a specific subject.",
			},
		},
	)
	.patch(
		"/subjects/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "subject");
			const validatedBody = updateSubjectDto.parse(body) as UpdateSubjectDto;
			const subject = await paymentsService.updateSubject(id, validatedBody);
			return { data: subject };
		},
		{
			body: updateSubjectDto,
			detail: {
				tags: ["Payments"],
				summary: "Update a subject",
				description: "Updates an existing subject's name or active status.",
			},
		},
	)
	.post(
		"/pricing-tariffs",
		async ({ body, set }) => {
			const validatedBody = createPricingTariffDto.parse(
				body,
			) as CreatePricingTariffDto;
			const tariff = await paymentsService.createPricingTariff(validatedBody);
			set.status = 201;
			return { data: tariff };
		},
		{
			body: createPricingTariffDto,
			detail: {
				tags: ["Payments"],
				summary: "Create a pricing tariff",
				description:
					"Creates a new pricing tariff based on student class and teacher level. Tariffs can be subject-specific or general.",
			},
		},
	)
	.get(
		"/pricing-tariffs",
		async ({ query }) => {
			const validatedQuery = getPricingTariffsQueryDto.parse(
				query,
			) as GetPricingTariffsQueryDto;
			const result =
				await paymentsService.findAllPricingTariffs(validatedQuery);
			return { data: result };
		},
		{
			query: getPricingTariffsQueryDto,
			detail: {
				tags: ["Payments"],
				summary: "Get list of pricing tariffs",
				description:
					"Retrieves a paginated list of pricing tariffs with optional filtering by student class, teacher level, and subject.",
			},
		},
	)
	.get(
		"/pricing-tariffs/:id",
		async ({ params }) => {
			const id = parseId(params.id, "pricing tariff");
			const tariff = await paymentsService.findPricingTariffById(id);
			return { data: tariff };
		},
		{
			detail: {
				tags: ["Payments"],
				summary: "Get pricing tariff by ID",
				description:
					"Retrieves detailed information about a specific pricing tariff.",
			},
		},
	)
	.patch(
		"/pricing-tariffs/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "pricing tariff");
			const validatedBody = updatePricingTariffDto.parse(
				body,
			) as UpdatePricingTariffDto;
			const tariff = await paymentsService.updatePricingTariff(
				id,
				validatedBody,
			);
			return { data: tariff };
		},
		{
			body: updatePricingTariffDto,
			detail: {
				tags: ["Payments"],
				summary: "Update a pricing tariff",
				description:
					"Updates an existing pricing tariff's amount, validity dates, or other properties.",
			},
		},
	)
	.post(
		"/teacher-subject-levels",
		// @ts-expect-error user is injected by authMacro
		async ({ body, user, set }) => {
			if (user.role !== "OWNER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only OWNER and ADMIN can manage teacher subject levels",
				);
			}
			const validatedBody = createTeacherSubjectLevelDto.parse(
				body,
			) as CreateTeacherSubjectLevelDto;
			const level =
				await paymentsService.createTeacherSubjectLevel(validatedBody);
			set.status = 201;
			return { data: level };
		},
		{
			body: createTeacherSubjectLevelDto,
			detail: {
				tags: ["Payments"],
				summary: "Create a teacher subject level",
				description:
					"Assigns a teacher level (1-4) for a specific subject. This determines the teacher's qualification level for that subject.",
			},
		},
	)
	.get(
		"/teacher-subject-levels",
		async ({ query }) => {
			const validatedQuery = getTeacherSubjectLevelsQueryDto.parse(
				query,
			) as GetTeacherSubjectLevelsQueryDto;
			const result =
				await paymentsService.findAllTeacherSubjectLevels(validatedQuery);
			return { data: result };
		},
		{
			query: getTeacherSubjectLevelsQueryDto,
			detail: {
				tags: ["Payments"],
				summary: "Get list of teacher subject levels",
				description:
					"Retrieves a paginated list of teacher subject levels with optional filtering by teacher, subject, and level.",
			},
		},
	)
	.get(
		"/teacher-subject-levels/:id",
		async ({ params }) => {
			const id = parseId(params.id, "teacher subject level");
			const level = await paymentsService.findTeacherSubjectLevelById(id);
			return { data: level };
		},
		{
			detail: {
				tags: ["Payments"],
				summary: "Get teacher subject level by ID",
				description:
					"Retrieves detailed information about a specific teacher subject level.",
			},
		},
	)
	.patch(
		"/teacher-subject-levels/:id",
		// @ts-expect-error user is injected by authMacro
		async ({ params, body, user }) => {
			if (user.role !== "OWNER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only OWNER and ADMIN can manage teacher subject levels",
				);
			}
			const id = parseId(params.id, "teacher subject level");
			const validatedBody = updateTeacherSubjectLevelDto.parse(
				body,
			) as UpdateTeacherSubjectLevelDto;
			const level = await paymentsService.updateTeacherSubjectLevel(
				id,
				validatedBody,
			);
			return { data: level };
		},
		{
			body: updateTeacherSubjectLevelDto,
			detail: {
				tags: ["Payments"],
				summary: "Update a teacher subject level",
				description:
					"Updates a teacher's level for a specific subject. This affects pricing calculations.",
			},
		},
	)
	.delete(
		"/teacher-subject-levels/:id",
		// @ts-expect-error user is injected by authMacro
		async ({ params, user }) => {
			if (user.role !== "OWNER" && user.role !== "ADMIN") {
				throw new ForbiddenError(
					"Only OWNER and ADMIN can manage teacher subject levels",
				);
			}
			const id = parseId(params.id, "teacher subject level");
			await paymentsService.deleteTeacherSubjectLevel(id);
			return { message: "Teacher subject level deleted successfully" };
		},
		{
			detail: {
				tags: ["Payments"],
				summary: "Delete a teacher subject level",
				description:
					"Deletes a teacher's subject level assignment. Cannot delete if the teacher has active groups for this subject.",
			},
		},
	)
	.post(
		"/school-classes",
		async ({ body, set }) => {
			const validatedBody = createSchoolClassDto.parse(
				body,
			) as CreateSchoolClassDto;
			const schoolClass =
				await paymentsService.createSchoolClass(validatedBody);
			set.status = 201;
			return { data: schoolClass };
		},
		{
			body: createSchoolClassDto,
			detail: {
				tags: ["Payments", "School Classes"],
				summary: "Create a school class tariff",
				description:
					"Creates a new school class with student price and teacher share rates for all 4 levels.",
			},
		},
	)
	.get(
		"/school-classes",
		async ({ query }) => {
			const validatedQuery = getSchoolClassesQueryDto.parse(
				query,
			) as GetSchoolClassesQueryDto;
			const result = await paymentsService.findAllSchoolClasses(validatedQuery);
			return { data: result };
		},
		{
			query: getSchoolClassesQueryDto,
			detail: {
				tags: ["Payments", "School Classes"],
				summary: "Get list of school classes",
				description:
					"Retrieves a paginated list of school classes with optional filtering by name and active status.",
			},
		},
	)
	.get(
		"/school-classes/:id",
		async ({ params }) => {
			const id = parseId(params.id, "school class");
			const schoolClass = await paymentsService.findSchoolClassById(id);
			return { data: schoolClass };
		},
		{
			detail: {
				tags: ["Payments", "School Classes"],
				summary: "Get school class by ID",
				description:
					"Retrieves detailed information about a specific school class.",
			},
		},
	)
	.patch(
		"/school-classes/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "school class");
			const validatedBody = updateSchoolClassDto.parse(
				body,
			) as UpdateSchoolClassDto;
			const schoolClass = await paymentsService.updateSchoolClass(
				id,
				validatedBody,
			);
			return { data: schoolClass };
		},
		{
			body: updateSchoolClassDto,
			detail: {
				tags: ["Payments", "School Classes"],
				summary: "Update a school class",
				description:
					"Updates an existing school class's name, price, teacher shares, or active status.",
			},
		},
	)
	.delete(
		"/school-classes/:id",
		async ({ params }) => {
			const id = parseId(params.id, "school class");
			await paymentsService.deleteSchoolClass(id);
			return { message: "School class deactivated successfully" };
		},
		{
			detail: {
				tags: ["Payments", "School Classes"],
				summary: "Deactivate a school class",
				description:
					"Deactivates a school class (soft delete). The record is not permanently deleted.",
			},
		},
	);
