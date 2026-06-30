import type { Role } from "@generated/prisma/client";

export type User = {
	id: number;
	username: string;
	fullname: string;
	phone: string | null;
	role: Role;
	isActive: boolean;
	externalId: string | null;
	syncedToDevice: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type UserListResponse = {
	users: User[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};
