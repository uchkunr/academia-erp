import { parseId } from "@lib/utils";
import { Elysia } from "elysia";
import {
	type CreateGroupDto,
	createGroupDto,
	type GetGroupsQueryDto,
	getGroupsQueryDto,
	type UpdateGroupDto,
	updateGroupDto,
} from "./groups.dto";
import { GroupsService } from "./groups.service";

const groupsService = new GroupsService();

export const groupsController = new Elysia({ prefix: "/groups" })
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createGroupDto.parse(body) as CreateGroupDto;
			const group = await groupsService.create(validatedBody);
			set.status = 201;
			return { data: group };
		},
		{
			body: createGroupDto,
			detail: {
				tags: ["Groups"],
				summary: "Create a new group",
				description:
					"Creates a new group with a course, teacher, and schedule. The teacher rate determines how much the teacher earns per student in this group.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getGroupsQueryDto.parse(
				query,
			) as GetGroupsQueryDto;
			const result = await groupsService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getGroupsQueryDto,
			detail: {
				tags: ["Groups"],
				summary: "Get list of groups",
				description:
					"Retrieves a paginated list of groups with optional filtering by course, teacher, search query, and active status.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "group");
			const group = await groupsService.findById(id);
			return { data: group };
		},
		{
			detail: {
				tags: ["Groups"],
				summary: "Get group by ID",
				description:
					"Retrieves detailed information about a specific group including course details, teacher information, and student count.",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "group");
			const validatedBody = updateGroupDto.parse(body) as UpdateGroupDto;
			const group = await groupsService.update(id, validatedBody);
			return { data: group };
		},
		{
			body: updateGroupDto,
			detail: {
				tags: ["Groups"],
				summary: "Update group information",
				description:
					"Updates group information. Only provided fields will be updated. Course and teacher must be active if changed.",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "group");
			await groupsService.delete(id);
			return { message: "Group deactivated successfully" };
		},
		{
			detail: {
				tags: ["Groups"],
				summary: "Deactivate group",
				description:
					"Deactivates a group (soft delete). The group record is not permanently deleted, but marked as inactive. Students remain enrolled but the group won't appear in active listings.",
			},
		},
	);
