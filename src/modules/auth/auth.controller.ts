import { env } from "@config/env";
import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import {
	type LoginDto,
	loginDto,
	type RegisterDto,
	registerDto,
} from "./auth.dto";
import { AuthService } from "./auth.service";

const authService = new AuthService();

export const authController = new Elysia({ prefix: "/auth" })
	.use(
		jwt({
			name: "jwt",
			secret: env.JWT_SECRET,
		}),
	)
	.post(
		"/login",
		async ({ body, jwt }) => {
			const validatedBody = loginDto.parse(body) as LoginDto;
			const user = await authService.login(validatedBody);

			const token = await (jwt.sign as (payload: unknown) => Promise<string>)({
				userId: user.id,
				username: user.username,
				role: user.role,
			});

			return {
				data: {
					user,
					token,
				},
			};
		},
		{
			body: loginDto,
			detail: {
				tags: ["Authentication"],
				summary: "Login user",
				description:
					"Authenticates a user with username and password. Returns user information and a JWT token. The token should be included in the Authorization header as 'Bearer {token}' for subsequent requests.",
			},
		},
	)
	.post(
		"/register",
		async ({ body, jwt, set }) => {
			const validatedBody = registerDto.parse(body) as RegisterDto;
			const user = await authService.register(validatedBody);

			const token = await (jwt.sign as (payload: unknown) => Promise<string>)({
				userId: user.id,
				username: user.username,
				role: user.role,
			});

			set.status = 201;
			return {
				data: {
					user,
					token,
				},
			};
		},
		{
			body: registerDto,
			detail: {
				tags: ["Authentication"],
				summary: "Register new user",
				description:
					"Creates a new user account and automatically logs them in. Returns user information and a JWT token. Username must be unique. Password is automatically hashed. Default role is TEACHER if not specified.",
			},
		},
	);
