import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	PORT: z.string(),
	HOSTNAME: z.string(),
	NODE_ENV: z
		.enum(["development", "production", "staging"])
		.default("development"),
	DATABASE_URL: z.string(),
	JWT_SECRET: z.string(),
	CORS_ORIGIN: z.string(),
	OPENAPI_USERNAME: z.string().optional(),
	OPENAPI_PASSWORD: z.string().optional(),
	DEFAULT_USERNAME: z.string(),
	DEFAULT_PASSWD: z.string(),
	BRANCH_NAME: z.string().default("Main branch"),
});

export const env = envSchema.parse(process.env);
