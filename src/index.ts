import { authMacro } from "@auth.macro";
import { env } from "@config/env";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import { errorHandler } from "@lib/error-handler";
import { prisma } from "@lib/prisma";
import { parseId } from "@lib/utils";
import { attendanceController } from "@modules/attendance";
import { authController } from "@modules/auth/auth.controller";
import { coursesController } from "@modules/courses";
import { devicesController } from "@modules/devices";
import { financeController } from "@modules/finance";
import { gradesController } from "@modules/grades";
import { groupsController } from "@modules/groups";
import { lessonsController } from "@modules/lessons";
import { paymentsController } from "@modules/payments";
import { PaymentsService } from "@modules/payments/payments.service";
import { reportsController } from "@modules/reports";
import { studentsController } from "@modules/students";
import { usersController } from "@modules/users";
import { Elysia } from "elysia";

const receiptService = new PaymentsService();

const publicRoutes = new Elysia({ prefix: "/api/v1" }).get(
	"/payments/:id/receipt",
	async ({ params }) => {
		const id = parseId(params.id, "payment");
		const receipt = await receiptService.getReceipt(id);
		return { data: receipt };
	},
	{
		detail: {
			tags: ["Payments"],
			summary: "Get payment receipt (public)",
			description:
				"Returns full receipt data for a payment. This endpoint is public and does not require authentication.",
		},
	},
);

const apiV1 = new Elysia({ prefix: "/api/v1" })
	.use(authMacro)

	.guard(
		{
			auth: true,
		},
		(app) =>
			app
				.use(usersController)
				.use(studentsController)
				.use(coursesController)
				.use(groupsController)
				.use(lessonsController)
				.use(paymentsController)
				.use(attendanceController)
				.use(gradesController)
				.use(reportsController)
				.use(devicesController)
				.use(financeController),
	);

const app = new Elysia({
	name: "academia-erp",
	aot: true,
	strictPath: false,
	normalize: true,
	nativeStaticResponse: true,
	serve: {
		hostname: env.HOSTNAME,
		maxRequestBodySize: 1024 * 1024 * 10,
		idleTimeout: 30,
		reusePort: true,
	},
})
	.onError(errorHandler)
	.use(
		openapi({
			documentation: {
				info: {
					title: "Academia ERP API",
					version: "1.0.0",
					description: "Educational Resource Planning System",
				},
			},
		}),
	)
	.use(
		serverTiming({
			enabled: env.NODE_ENV !== "production",
		}),
	)
	.use(
		cors({
			origin: env.CORS_ORIGIN.split(",").map((url) => url.trim()),
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.get("/", () => "Happy coding!")
	.get("/health", async () => ({
		status: await prisma.$queryRaw`SELECT 1`
			.then(() => "ok")
			.catch((err) => {
				if (env.NODE_ENV !== "production") {
					console.log(err.message);
				}
				return "degraded";
			}),
		timestamp: new Date().toISOString(),
	}))
	.use(authController)
	.use(publicRoutes)
	.use(apiV1)
	.listen(Number(env.PORT));

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
