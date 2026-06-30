import type { ErrorHandler } from "elysia";
import { ZodError } from "zod";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "./http-errors";

export const errorHandler: ErrorHandler = ({ code, error, set }) => {
	if (code === "VALIDATION") {
		set.status = 422;

		let validationError: {
			type?: string;
			on?: string;
			property?: string;
			message?: string;
			found?: unknown;
			errors?: Array<{
				code: string;
				path: string[];
				message: string;
				expected?: string;
			}>;
		};

		if (error instanceof Error) {
			try {
				validationError = JSON.parse(error.message);
			} catch {
				validationError = error as never;
			}
		} else {
			validationError = error as never;
		}

		if (validationError.errors && Array.isArray(validationError.errors)) {
			return {
				error: {
					message: "Validation failed",
					validation: {
						on: validationError.on,
						errors: validationError.errors.map((e) => ({
							field: e.path.join(".") || validationError.property || "unknown",
							message: e.message,
							expected: e.expected,
						})),
					},
				},
			};
		}

		if (error instanceof ZodError) {
			return {
				error: {
					message: "Validation failed",
					validation: {
						errors: error.issues.map((e) => ({
							field: e.path.join(".") || "unknown",
							message: e.message,
						})),
					},
				},
			};
		}

		return {
			error: {
				message: "Validation failed",
				validation: {
					details: String(error),
				},
			},
		};
	}

	if (error instanceof NotFoundError) {
		set.status = 404;
		return { error: { message: error.message } };
	}

	if (error instanceof UnauthorizedError) {
		set.status = 401;
		return { error: { message: error.message } };
	}

	if (error instanceof ForbiddenError) {
		set.status = 403;
		return { error: { message: error.message } };
	}

	if (error instanceof ConflictError) {
		set.status = 409;
		return { error: { message: error.message } };
	}

	if (error instanceof Error) {
		const status = (error as { statusCode?: number }).statusCode || 500;
		set.status = status;
		return {
			error: {
				message: error.message,
				...(process.env.NODE_ENV === "development" && { stack: error.stack }),
			},
		};
	}

	set.status = 500;
	return { error: { message: "Internal server error" } };
};
