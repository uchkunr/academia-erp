import { parseId } from "@lib/utils";
import { Elysia } from "elysia";

import {
	type CreateDeviceDto,
	type CreatePersonDto,
	createDeviceDto,
	createPersonDto,
	type GetDeviceLogsQueryDto,
	type GetDevicesQueryDto,
	type GetEventsQueryDto,
	getDeviceLogsQueryDto,
	getDevicesQueryDto,
	getEventsQueryDto,
	type SyncPersonsDto,
	syncPersonsDto,
	type UpdateDeviceDto,
	type UploadFaceDto,
	updateDeviceDto,
	uploadFaceDto,
} from "./devices.dto";
import { DevicesService } from "./devices.service";

const devicesService = new DevicesService();

export const devicesController = new Elysia({ prefix: "/devices" })
	.post(
		"/",
		async ({ body, set }) => {
			const validatedBody = createDeviceDto.parse(body) as CreateDeviceDto;
			const device = await devicesService.create(validatedBody);
			set.status = 201;
			return { data: device };
		},
		{
			body: createDeviceDto,
			detail: {
				tags: ["Devices"],
				summary: "Create a new device",
				description: "Registers a new Hikvision device in the system.",
			},
		},
	)
	.get(
		"/",
		async ({ query }) => {
			const validatedQuery = getDevicesQueryDto.parse(
				query,
			) as GetDevicesQueryDto;
			const result = await devicesService.findAll(validatedQuery);
			return { data: result };
		},
		{
			query: getDevicesQueryDto,
			detail: {
				tags: ["Devices"],
				summary: "Get list of devices",
				description:
					"Retrieves a paginated list of devices with optional filtering.",
			},
		},
	)
	.get(
		"/check-all",
		async () => {
			const result = await devicesService.checkAllConnections();
			return { data: result };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Check all device connections",
				description:
					"Tests connectivity to all active devices and updates their status.",
			},
		},
	)
	.get(
		"/logs",
		async ({ query }) => {
			const validatedQuery = getDeviceLogsQueryDto.parse(
				query,
			) as GetDeviceLogsQueryDto;
			const result = await devicesService.findAllDeviceLogs(validatedQuery);
			return { data: result };
		},
		{
			query: getDeviceLogsQueryDto,
			detail: {
				tags: ["Devices"],
				summary: "Get device event logs",
				description:
					"Paginated list of access events stored from Hikvision devices (synced via attendance sync). Filter by device, user, date range, processed status.",
			},
		},
	)
	.post(
		"/sync-all",
		async ({ body }) => {
			const validatedBody = syncPersonsDto.parse(body) as SyncPersonsDto;
			const result = await devicesService.syncToAllDevices(validatedBody);
			return { data: result };
		},
		{
			body: syncPersonsDto,
			detail: {
				tags: ["Devices"],
				summary: "Sync persons to all devices",
				description:
					"Syncs a list of persons (with optional face images) to all active face terminals.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "device");
			const device = await devicesService.findById(id);
			return { data: device };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Get device by ID",
				description: "Retrieves detailed information about a specific device.",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const id = parseId(params.id, "device");
			const validatedBody = updateDeviceDto.parse(body) as UpdateDeviceDto;
			const device = await devicesService.update(id, validatedBody);
			return { data: device };
		},
		{
			body: updateDeviceDto,
			detail: {
				tags: ["Devices"],
				summary: "Update device",
				description: "Updates device configuration.",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const id = parseId(params.id, "device");
			await devicesService.delete(id);
			return { message: "Device deactivated successfully" };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Deactivate device",
				description: "Deactivates a device (soft delete).",
			},
		},
	)
	.get(
		"/:id/check",
		async ({ params }) => {
			const id = parseId(params.id, "device");
			const result = await devicesService.checkConnection(id);
			return { data: result };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Check device connection",
				description:
					"Tests connectivity to a specific device and updates its status.",
			},
		},
	)
	.get(
		"/:id/events",
		async ({ params, query }) => {
			const id = parseId(params.id, "device");
			const validatedQuery = getEventsQueryDto.parse(
				query,
			) as GetEventsQueryDto;
			const result = await devicesService.getEvents(id, validatedQuery);
			return { data: result };
		},
		{
			query: getEventsQueryDto,
			detail: {
				tags: ["Devices"],
				summary: "Get access events",
				description: "Retrieves access control events from the device.",
			},
		},
	)
	.get(
		"/:id/persons",
		async ({ params }) => {
			const id = parseId(params.id, "device");
			const result = await devicesService.getPersons(id);
			return { data: result };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Get persons from device",
				description: "Retrieves all registered persons from the device.",
			},
		},
	)
	.post(
		"/:id/persons",
		async ({ params, body, set }) => {
			const id = parseId(params.id, "device");
			const validatedBody = createPersonDto.parse(body) as CreatePersonDto;
			const result = await devicesService.createPerson(id, validatedBody);
			set.status = 201;
			return { data: result };
		},
		{
			body: createPersonDto,
			detail: {
				tags: ["Devices"],
				summary: "Create person on device",
				description: "Registers a new person on the device.",
			},
		},
	)
	.get(
		"/:id/persons/:employeeNo/face",
		async ({ params }) => {
			const id = parseId(params.id, "device");
			const face = await devicesService.getPersonFace(id, params.employeeNo);
			return { data: face };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Get person face image from device",
				description:
					"Retrieves the face image stored on the device for a specific person. Returns base64 encoded image.",
			},
		},
	)
	.delete(
		"/:id/persons/:employeeNo",
		async ({ params }) => {
			const id = parseId(params.id, "device");
			const result = await devicesService.deletePerson(id, params.employeeNo);
			return { data: result };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Delete person from device",
				description: "Removes a person and their face data from the device.",
			},
		},
	)
	.post(
		"/:id/faces",
		async ({ params, body, set }) => {
			const id = parseId(params.id, "device");
			const validatedBody = uploadFaceDto.parse(body) as UploadFaceDto;
			const result = await devicesService.uploadFace(id, validatedBody);
			set.status = 201;
			return { data: result };
		},
		{
			body: uploadFaceDto,
			detail: {
				tags: ["Devices"],
				summary: "Upload face image",
				description:
					"Uploads a face image for a person on the device. Accepts base64 encoded image.",
			},
		},
	)
	.post(
		"/:id/sync",
		async ({ params, body }) => {
			const id = parseId(params.id, "device");
			const validatedBody = syncPersonsDto.parse(body) as SyncPersonsDto;
			const result = await devicesService.syncPersons(id, validatedBody);
			return { data: result };
		},
		{
			body: syncPersonsDto,
			detail: {
				tags: ["Devices"],
				summary: "Sync persons to device",
				description:
					"Syncs a list of persons (with optional face images) to the device.",
			},
		},
	)
	.post(
		"/:id/open-door",
		async ({ params, body }) => {
			const id = parseId(params.id, "device");
			const doorNo = (body as { doorNo?: number })?.doorNo || 1;
			const result = await devicesService.openDoor(id, doorNo);
			return { data: result };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Open door remotely",
				description: "Sends a remote command to open the door.",
			},
		},
	)
	.post(
		"/:id/reboot",
		async ({ params }) => {
			const id = parseId(params.id, "device");
			const result = await devicesService.reboot(id);
			return { data: result };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Reboot device",
				description: "Sends a reboot command to the device.",
			},
		},
	)
	.get(
		"/:id/capabilities",
		async ({ params }) => {
			const id = parseId(params.id, "device");
			const result = await devicesService.getCapabilities(id);
			return { data: result };
		},
		{
			detail: {
				tags: ["Devices"],
				summary: "Get device capabilities",
				description: "Retrieves the access control capabilities of the device.",
			},
		},
	);
