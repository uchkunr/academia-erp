import { UnauthorizedError } from "@lib/http-errors";
import { verifyToken } from "@lib/verify-token";
import { type Context, Elysia } from "elysia";

export const authMacro = new Elysia().macro({
	auth(enabled: boolean) {
		if (!enabled) return {};

		return {
			resolve: async ({ request }: Context & { request: Request }) => {
				const authHeader = request.headers.get("authorization");
				if (!authHeader?.startsWith("Bearer ")) {
					throw new UnauthorizedError("No token provided");
				}

				const token = authHeader.split(" ")[1];
				const user = await verifyToken(token);
				return { user };
			},
		};
	},
});
