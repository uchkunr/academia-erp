import {
	type AcsEventResult,
	type DeviceConfig,
	HikvisionClient,
	type HikvisionResponse,
	type UserInfoSearchResult,
} from "@lib/hikvision";
import { ConflictError, NotFoundError } from "@lib/http-errors";
import { prisma } from "@lib/prisma";
import {
	buildDateRangeFilter,
	calculatePagination,
	calculateTotalPages,
} from "@lib/utils";

import type {
	CreateDeviceDto,
	CreatePersonDto,
	GetDeviceLogsQueryDto,
	GetDevicesQueryDto,
	GetEventsQueryDto,
	SyncPersonsDto,
	UpdateDeviceDto,
	UploadFaceDto,
} from "./devices.dto";
import type {
	Device,
	DeviceConnectionStatus,
	DeviceListResponse,
	DeviceWithPassword,
	SyncResult,
} from "./devices.types";

export class DevicesService {
	private readonly deviceSelect = {
		id: true,
		name: true,
		type: true,
		ipAddress: true,
		port: true,
		username: true,
		doorCount: true,
		serialNumber: true,
		location: true,
		lastSync: true,
		lastOnline: true,
		status: true,
		isActive: true,
		createdAt: true,
		updatedAt: true,
	};

	private getClient(device: DeviceWithPassword): HikvisionClient {
		const config: DeviceConfig = {
			id: device.id,
			ipAddress: device.ipAddress,
			port: device.port,
			username: device.username,
			password: device.password,
		};
		return new HikvisionClient(config);
	}

	private async getDeviceWithPassword(id: number): Promise<DeviceWithPassword> {
		const device = await prisma.device.findUnique({
			where: { id },
		});

		if (!device) {
			throw new NotFoundError("Device not found");
		}

		return device as DeviceWithPassword;
	}

	async create(data: CreateDeviceDto): Promise<Device> {
		const existing = await prisma.device.findFirst({
			where: {
				ipAddress: data.ipAddress,
				port: data.port,
			},
		});

		if (existing) {
			throw new ConflictError(
				"Device with this IP address and port already exists",
			);
		}

		if (data.serialNumber) {
			const existingSerial = await prisma.device.findUnique({
				where: { serialNumber: data.serialNumber },
			});

			if (existingSerial) {
				throw new ConflictError(
					"Device with this serial number already exists",
				);
			}
		}

		const device = await prisma.device.create({
			data: {
				name: data.name,
				type: data.type,
				ipAddress: data.ipAddress,
				port: data.port,
				username: data.username,
				password: data.password,
				doorCount: data.doorCount,
				serialNumber: data.serialNumber,
				location: data.location,
			},
			select: this.deviceSelect,
		});

		return device;
	}

	async findAll(query: GetDevicesQueryDto): Promise<DeviceListResponse> {
		const { page, limit, search, type, status, isActive } = query;
		const { skip, take } = calculatePagination(page, limit);

		const where = {
			...(search && {
				OR: [
					{ name: { contains: search, mode: "insensitive" as const } },
					{ ipAddress: { contains: search, mode: "insensitive" as const } },
					{ location: { contains: search, mode: "insensitive" as const } },
				],
			}),
			...(type && { type }),
			...(status && { status }),
			...(isActive !== undefined && { isActive }),
		};

		const [devices, total] = await Promise.all([
			prisma.device.findMany({
				where,
				select: this.deviceSelect,
				orderBy: { createdAt: "desc" },
				skip,
				take,
			}),
			prisma.device.count({ where }),
		]);

		return {
			devices,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}

	async findById(id: number): Promise<Device> {
		const device = await prisma.device.findUnique({
			where: { id },
			select: this.deviceSelect,
		});

		if (!device) {
			throw new NotFoundError("Device not found");
		}

		return device;
	}

	async update(id: number, data: UpdateDeviceDto): Promise<Device> {
		const existing = await prisma.device.findUnique({
			where: { id },
		});

		if (!existing) {
			throw new NotFoundError("Device not found");
		}

		if (data.ipAddress || data.port) {
			const conflict = await prisma.device.findFirst({
				where: {
					ipAddress: data.ipAddress || existing.ipAddress,
					port: data.port || existing.port,
					id: { not: id },
				},
			});

			if (conflict) {
				throw new ConflictError(
					"Device with this IP address and port already exists",
				);
			}
		}

		if (data.serialNumber) {
			const existingSerial = await prisma.device.findFirst({
				where: {
					serialNumber: data.serialNumber,
					id: { not: id },
				},
			});

			if (existingSerial) {
				throw new ConflictError(
					"Device with this serial number already exists",
				);
			}
		}

		const device = await prisma.device.update({
			where: { id },
			data,
			select: this.deviceSelect,
		});

		return device;
	}

	async delete(id: number): Promise<void> {
		const device = await prisma.device.findUnique({
			where: { id },
		});

		if (!device) {
			throw new NotFoundError("Device not found");
		}

		await prisma.device.delete({
			where: { id },
		});
	}

	async checkConnection(id: number): Promise<DeviceConnectionStatus> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		const result = await client.checkConnection();

		await prisma.device.update({
			where: { id },
			data: {
				status: result.online ? "ONLINE" : "OFFLINE",
				lastOnline: result.online ? new Date() : undefined,
				serialNumber: result.info?.serialNumber || device.serialNumber,
			},
		});

		return {
			deviceId: id,
			online: result.online,
			deviceName: result.info?.deviceName,
			serialNumber: result.info?.serialNumber,
			model: result.info?.model,
			firmwareVersion: result.info?.firmwareVersion,
		};
	}

	async checkAllConnections(): Promise<DeviceConnectionStatus[]> {
		const devices = await prisma.device.findMany({
			where: { isActive: true },
		});

		const results: DeviceConnectionStatus[] = [];

		for (const device of devices) {
			const client = this.getClient(device as DeviceWithPassword);
			const result = await client.checkConnection();

			await prisma.device.update({
				where: { id: device.id },
				data: {
					status: result.online ? "ONLINE" : "OFFLINE",
					lastOnline: result.online ? new Date() : undefined,
					serialNumber: result.info?.serialNumber || device.serialNumber,
				},
			});

			results.push({
				deviceId: device.id,
				online: result.online,
				deviceName: result.info?.deviceName,
				serialNumber: result.info?.serialNumber,
				model: result.info?.model,
				firmwareVersion: result.info?.firmwareVersion,
			});
		}

		return results;
	}

	async getEvents(
		id: number,
		query: GetEventsQueryDto,
	): Promise<AcsEventResult | null> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		return client.getAccessEvents({
			startTime: query.startTime,
			endTime: query.endTime,
			maxResults: query.maxResults,
		});
	}

	async fetchAndStoreEvents(options: {
		deviceId?: number;
		startTime?: Date;
		endTime?: Date;
		maxResults?: number;
	}): Promise<{
		deviceLogsCreated: number;
		errors: Array<{ deviceId: number; deviceName: string; error: string }>;
	}> {
		const deviceList = options.deviceId
			? await prisma.device.findMany({
					where: { id: options.deviceId, isActive: true },
				})
			: await prisma.device.findMany({
					where: { isActive: true, type: "FACE_TERMINAL" },
				});

		const result = {
			deviceLogsCreated: 0,
			errors: [] as Array<{
				deviceId: number;
				deviceName: string;
				error: string;
			}>,
		};

		for (const device of deviceList) {
			const withPassword = device as DeviceWithPassword;
			let client: HikvisionClient;
			try {
				client = this.getClient(withPassword);
			} catch {
				result.errors.push({
					deviceId: device.id,
					deviceName: device.name,
					error: "Failed to create client",
				});
				continue;
			}

			const eventsResult = await client.getAccessEvents({
				startTime: options.startTime,
				endTime: options.endTime,
				maxResults: options.maxResults ?? 500,
			});

			if (!eventsResult?.AcsEvent?.InfoList?.length) continue;

			const deviceSn = device.serialNumber ?? `device-${device.id}`;

			for (const info of eventsResult.AcsEvent.InfoList) {
				const externalUserId = info.employeeNoString?.trim();
				if (!externalUserId) continue;

				const timestamp = info.time ? new Date(info.time) : new Date();
				if (Number.isNaN(timestamp.getTime())) continue;

				const direction = info.attendanceStatus ?? "in";

				try {
					await prisma.deviceLog.create({
						data: {
							externalUserId,
							timestamp,
							direction,
							deviceSn,
							deviceId: device.id,
							isProcessed: false,
						},
					});
					result.deviceLogsCreated++;
				} catch {
					result.errors.push({
						deviceId: device.id,
						deviceName: device.name,
						error: `Failed to save event for ${externalUserId}`,
					});
				}
			}
		}

		return result;
	}

	async getPersons(id: number): Promise<UserInfoSearchResult | null> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		return client.getPersons({ maxResults: 1000 });
	}

	async createPerson(
		id: number,
		data: CreatePersonDto,
	): Promise<HikvisionResponse> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		return client.createPerson(data.employeeNo, data.name, {
			beginTime: data.beginTime,
			endTime: data.endTime,
		});
	}

	async deletePerson(
		id: number,
		employeeNo: string,
	): Promise<HikvisionResponse> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		const [personResult, faceResult] = await Promise.all([
			client.deletePerson(employeeNo),
			client.deleteFace(employeeNo),
		]);

		return personResult.statusCode === 1 ? personResult : faceResult;
	}

	async getPersonFace(id: number, employeeNo: string): Promise<string | null> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		const searchResult = await client.searchFace(employeeNo);
		if (!searchResult?.faceURL) return null;

		const imageBuffer = await client.downloadFace(searchResult.faceURL);
		if (!imageBuffer) return null;

		return `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
	}

	async uploadFace(
		id: number,
		data: UploadFaceDto,
	): Promise<HikvisionResponse> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		return client.uploadFace(data.employeeNo, data.faceImage);
	}

	async syncPersons(id: number, data: SyncPersonsDto): Promise<SyncResult> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		await prisma.device.update({
			where: { id },
			data: { status: "SYNCING" },
		});

		const results: SyncResult = {
			deviceId: id,
			deviceName: device.name,
			totalPersons: data.persons.length,
			synced: 0,
			failed: 0,
			errors: [],
		};

		for (const person of data.persons) {
			try {
				const createResult = await client.createPerson(
					person.employeeNo,
					person.name,
				);

				if (
					createResult.statusCode !== 1 &&
					createResult.statusString !== "OK" &&
					createResult.subStatusCode !== "deviceUserAlreadyExist"
				) {
					results.failed++;
					results.errors.push({
						employeeNo: person.employeeNo,
						success: false,
						error:
							createResult.errorMsg ||
							createResult.subStatusCode ||
							"Failed to create person",
					});
					continue;
				}

				if (person.faceImage) {
					const faceResult = await client.uploadFace(
						person.employeeNo,
						person.faceImage,
					);

					if (faceResult.statusCode !== 1 && faceResult.statusString !== "OK") {
						results.failed++;
						results.errors.push({
							employeeNo: person.employeeNo,
							success: false,
							error: faceResult.errorMsg || "Failed to upload face",
						});
						continue;
					}
				}

				results.synced++;
			} catch (error) {
				results.failed++;
				results.errors.push({
					employeeNo: person.employeeNo,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		await prisma.device.update({
			where: { id },
			data: {
				status: "ONLINE",
				lastSync: new Date(),
			},
		});

		return results;
	}

	async syncToAllDevices(data: SyncPersonsDto): Promise<SyncResult[]> {
		const devices = await prisma.device.findMany({
			where: { isActive: true, type: "FACE_TERMINAL" },
		});

		const results: SyncResult[] = [];

		for (const device of devices) {
			const result = await this.syncPersons(device.id, data);
			results.push(result);
		}

		return results;
	}

	async openDoor(id: number, doorNo: number = 1): Promise<HikvisionResponse> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		return client.openDoor(doorNo);
	}

	async reboot(id: number): Promise<HikvisionResponse> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		await prisma.device.update({
			where: { id },
			data: { status: "OFFLINE" },
		});

		return client.reboot();
	}

	async getCapabilities(id: number): Promise<Record<string, unknown> | null> {
		const device = await this.getDeviceWithPassword(id);
		const client = this.getClient(device);

		return client.getCapabilities();
	}

	async findAllDeviceLogs(query: GetDeviceLogsQueryDto): Promise<{
		logs: Array<{
			id: number;
			externalUserId: string;
			timestamp: Date;
			direction: string;
			deviceSn: string;
			deviceId: number | null;
			isProcessed: boolean;
			device?: { id: number; name: string } | null;
		}>;
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	}> {
		const {
			page,
			limit,
			deviceId,
			externalUserId,
			startDate,
			endDate,
			isProcessed,
		} = query;
		const { skip, take } = calculatePagination(page, limit);
		const dateFilter = buildDateRangeFilter(startDate, endDate, "timestamp");

		const where = {
			...(deviceId && { deviceId }),
			...(externalUserId && { externalUserId }),
			...(isProcessed !== undefined && { isProcessed }),
			...(Object.keys(dateFilter).length > 0 && dateFilter),
		};

		const [logs, total] = await Promise.all([
			prisma.deviceLog.findMany({
				where,
				select: {
					id: true,
					externalUserId: true,
					timestamp: true,
					direction: true,
					deviceSn: true,
					deviceId: true,
					isProcessed: true,
					device: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: { timestamp: "desc" },
				skip,
				take,
			}),
			prisma.deviceLog.count({ where }),
		]);

		return {
			logs,
			total,
			page,
			limit,
			totalPages: calculateTotalPages(total, limit),
		};
	}
}
