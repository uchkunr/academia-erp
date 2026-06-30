import { parseId } from "@lib/utils";
import { Elysia } from "elysia";
import {
	type ChangePasswordDto,
	type CreateUserDto,
	changePasswordDto,
	createUserDto,
	type GetUsersQueryDto,
	getUsersQueryDto,
	type UpdateUserDto,
	type UpdateUserPasswordDto,
	updateUserDto,
	updateUserPasswordDto,
} from "./users.dto";
import { UsersService } from "./users.service";

const usersService = new UsersService();

export const usersController = new Elysia({ prefix: "/users" })
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createUserDto.parse(body) as CreateUserDto;
			const user = await usersService.create(validatedBody);
			set.status = 201;
			return { data: user };
		},
		{
			body: createUserDto,
			detail: {
				tags: ["Users"],
				summary: "Create a new user",
				description:
					"Creates a new staff user (teacher, admin, cashier, or owner). Requires unique username and optional phone number. Password is automatically hashed.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getUsersQueryDto.parse(query) as GetUsersQueryDto;
			const result = await usersService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getUsersQueryDto,
			detail: {
				tags: ["Users"],
				summary: "Get list of users",
				description:
					"Retrieves a paginated list of staff users with optional filtering by role, search query, and active status.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "user");
			const user = await usersService.findById(id);
			return { data: user };
		},
		{
			detail: {
				tags: ["Users"],
				summary: "Get user by ID",
				description:
					"Retrieves detailed information about a specific staff user including their role and active status. Password is never returned.",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "user");
			const validatedBody = updateUserDto.parse(body) as UpdateUserDto;
			const user = await usersService.update(id, validatedBody);
			return { data: user };
		},
		{
			body: updateUserDto,
			detail: {
				tags: ["Users"],
				summary: "Update user information",
				description:
					"Updates user information. Only provided fields will be updated. Phone number must be unique if provided. Role changes require appropriate permissions.",
			},
		},
	)
	.post(
		"/:id/sync",
		async ({ params }) => {
			const id = parseId(params.id, "user");
			const user = await usersService.syncToDevices(id);
			return { data: user };
		},
		{
			detail: {
				tags: ["Users"],
				summary: "Sync user to all devices",
				description:
					"Re-syncs user face data to all active Hikvision face terminal devices.",
			},
		},
	)
	.patch(
		"/:id/password",
		async ({ params, body }) => {
			const id = parseId(params.id, "user");
			const validatedBody = updateUserPasswordDto.parse(
				body,
			) as UpdateUserPasswordDto;
			await usersService.updatePassword(id, validatedBody);
			return { message: "Password updated successfully" };
		},
		{
			body: updateUserPasswordDto,
			detail: {
				tags: ["Users"],
				summary: "Update user password (admin)",
				description:
					"Allows an administrator to update another user's password. The new password is automatically hashed. Requires admin privileges.",
			},
		},
	)
	.post(
		"/change-password",
		// @ts-expect-error - Elysia user object is set by auth macro but not strongly typed here
		async ({ body, user }) => {
			const validatedBody = changePasswordDto.parse(body) as ChangePasswordDto;
			await usersService.changePassword(user.userId, validatedBody);
			return { message: "Password changed successfully" };
		},
		{
			body: changePasswordDto,
			detail: {
				tags: ["Users"],
				summary: "Change own password",
				description:
					"Allows a user to change their own password. Requires the current password for verification. The new password is automatically hashed.",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "user");
			await usersService.delete(id);
			return { message: "User deleted successfully" };
		},
		{
			detail: {
				tags: ["Users"],
				summary: "Delete user",
				description:
					"Deactivates a user account (soft delete). The user record is not permanently deleted, but marked as inactive. The user will no longer be able to log in.",
			},
		},
	);
