import { syncPersonToAllDevices } from "@lib/hikvision-sync";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import { calculatePagination, calculateTotalPages } from "@lib/utils";

import type {
	ChangePasswordDto,
	CreateUserDto,
	GetUsersQueryDto,
	UpdateUserDto,
	UpdateUserPasswordDto,
} from "./users.dto";
import type { User, UserListResponse } from "./users.types";

const userSelect = {
	id: true,
	username: true,
	fullname: true,
	phone: true,
	role: true,
	isActive: true,
	externalId: true,
	syncedToDevice: true,
	createdAt: true,
	updatedAt: true,
};

export class UsersService {
	async create(data: CreateUserDto): Promise<User> {
		const existingUser = await prisma.user.findUnique({
			where: { username: data.username },
		});

		if (existingUser) {
			throw new ConflictError("Username already exists");
		}

		if (data.phone) {
			const existingPhone = await prisma.user.findUnique({
				where: { phone: data.phone },
			});

			if (existingPhone) {
				throw new ConflictError("Phone number already exists");
			}
		}

		const hashedPassword = await Bun.password.hash(data.password);

		const user = await prisma.user.create({
			data: {
				username: data.username,
				password: hashedPassword,
				fullname: data.fullname,
				phone: data.phone,
				role: data.role,
				faceImage: data.faceImage,
			},
			select: { id: true, fullname: true },
		});

		const externalId = `U${user.id}`;
		await prisma.user.update({
			where: { id: user.id },
			data: { externalId },
		});

		const syncResult = await syncPersonToAllDevices(
			externalId,
			user.fullname,
			data.faceImage,
		);
		await prisma.user.update({
			where: { id: user.id },
			data: { syncedToDevice: syncResult.synced > 0 },
		});

		const updated = await prisma.user.findUnique({
			where: { id: user.id },
			select: userSelect,
		});
		return updated as User;
	}

	async findAll(query: GetUsersQueryDto): Promise<UserListResponse> {
		const { page, limit, search, role, isActive } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(search && {
				OR: [
					{ fullname: { contains: search, mode: "insensitive" as const } },
					{ username: { contains: search, mode: "insensitive" as const } },
					{ phone: { contains: search, mode: "insensitive" as const } },
				],
			}),
			...(role && { role }),
			...(isActive !== undefined && { isActive }),
		};

		const [users, total] = await Promise.all([
			prisma.user.findMany({
				where,
				select: userSelect,
				orderBy: {
					createdAt: "desc",
				},
				skip,
				take,
			}),
			prisma.user.count({ where }),
		]);

		return {
			users,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<User> {
		const user = await prisma.user.findUnique({
			where: { id },
			select: userSelect,
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		return user as User;
	}

	async update(id: number, data: UpdateUserDto): Promise<User> {
		const existingUser = await prisma.user.findUnique({
			where: { id },
		});

		if (!existingUser) {
			throw new NotFoundError("User not found");
		}

		if (data.phone) {
			const phoneExists = await prisma.user.findFirst({
				where: {
					phone: data.phone,
					id: { not: id },
				},
			});

			if (phoneExists) {
				throw new ConflictError("Phone number already exists");
			}
		}

		await prisma.user.update({
			where: { id },
			data,
		});

		const needsSync =
			(data.faceImage !== undefined && data.faceImage !== null) ||
			data.fullname !== undefined;

		if (needsSync && existingUser.externalId) {
			const updatedName = data.fullname || existingUser.fullname;
			const faceImage = data.faceImage || existingUser.faceImage;

			if (faceImage) {
				const syncResult = await syncPersonToAllDevices(
					existingUser.externalId,
					updatedName,
					faceImage,
				);
				await prisma.user.update({
					where: { id },
					data: { syncedToDevice: syncResult.synced > 0 },
				});
			}
		}

		const user = await prisma.user.findUnique({
			where: { id },
			select: userSelect,
		});
		return user as User;
	}

	async syncToDevices(id: number): Promise<User> {
		const user = await prisma.user.findUnique({
			where: { id },
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		if (!user.faceImage) {
			throw new BadRequestError("User has no face image");
		}

		const externalId = user.externalId || `U${user.id}`;
		if (!user.externalId) {
			await prisma.user.update({
				where: { id },
				data: { externalId },
			});
		}

		const syncResult = await syncPersonToAllDevices(
			externalId,
			user.fullname,
			user.faceImage,
		);

		await prisma.user.update({
			where: { id },
			data: { syncedToDevice: syncResult.synced > 0 },
		});

		const updated = await prisma.user.findUnique({
			where: { id },
			select: userSelect,
		});
		return updated as User;
	}

	async changePassword(userId: number, data: ChangePasswordDto): Promise<void> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				password: true,
			},
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		const isPasswordValid = await Bun.password.verify(
			data.currentPassword,
			user.password,
		);

		if (!isPasswordValid) {
			throw new BadRequestError("Current password is incorrect");
		}

		const hashedPassword = await Bun.password.hash(data.newPassword);

		await prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});
	}

	async updatePassword(id: number, data: UpdateUserPasswordDto): Promise<void> {
		const user = await prisma.user.findUnique({
			where: { id },
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		const hashedPassword = await Bun.password.hash(data.newPassword);

		await prisma.user.update({
			where: { id },
			data: { password: hashedPassword },
		});
	}

	async delete(id: number): Promise<void> {
		const user = await prisma.user.findUnique({
			where: { id },
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		await prisma.user.delete({
			where: { id },
		});
	}
}
