import { syncPersonToAllDevices } from "@lib/hikvision-sync";
import { ConflictError, UnauthorizedError } from "@lib/http-errors";
import { prisma } from "@lib/prisma";

import type { LoginDto, RegisterDto } from "./auth.dto";
import type { AuthUser } from "./auth.types";

export class AuthService {
	async login(data: LoginDto): Promise<AuthUser> {
		const user = await prisma.user.findUnique({
			where: { username: data.username },
			select: {
				id: true,
				username: true,
				fullname: true,
				password: true,
				role: true,
				isActive: true,
			},
		});

		if (!user) {
			throw new UnauthorizedError("Invalid credentials");
		}

		if (!user.isActive) {
			throw new UnauthorizedError("Account is inactive");
		}

		const isPasswordValid = await Bun.password.verify(
			data.password,
			user.password,
		);

		if (!isPasswordValid) {
			throw new UnauthorizedError("Invalid credentials");
		}

		const { password: _password, ...userWithoutPassword } = user;
		return userWithoutPassword;
	}

	async register(data: RegisterDto): Promise<AuthUser> {
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

		const registered = await prisma.user.findUnique({
			where: { id: user.id },
			select: {
				id: true,
				username: true,
				fullname: true,
				role: true,
				isActive: true,
			},
		});
		return registered as AuthUser;
	}
}
