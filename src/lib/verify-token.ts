import { env } from "@config/env";
import jwt from "@elysiajs/jwt";
import { UnauthorizedError } from "./http-errors";

const jwtInstance = jwt({
	name: "jwt",
	secret: env.JWT_SECRET,
});

type JwtPayload = {
	userId: number;
	username: string;
	role: string;
};

export const verifyToken = async (token: string): Promise<JwtPayload> => {
	const verified = await jwtInstance.decorator.jwt.verify(token);
	if (!verified) {
		throw new UnauthorizedError("Invalid or expired token");
	}
	return verified as JwtPayload;
};
