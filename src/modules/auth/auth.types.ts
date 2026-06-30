import type { Role } from "@generated/prisma/client";

export type AuthUser = {
	id: number;
	username: string;
	fullname: string;
	role: Role;
	isActive: boolean;
};

export type AuthResponse = {
	user: AuthUser;
	token: string;
};

export type TokenPayload = {
	userId: number;
	username: string;
	role: Role;
};
