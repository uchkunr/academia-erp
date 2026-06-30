import type { DeviceStatus, DeviceType } from "@generated/prisma/client";

export type Device = {
	id: number;
	name: string;
	type: DeviceType;
	ipAddress: string;
	port: number;
	username: string;
	serialNumber: string | null;
	location: string | null;
	lastSync: Date | null;
	lastOnline: Date | null;
	status: DeviceStatus;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type DeviceWithPassword = Device & {
	password: string;
};

export type DeviceListResponse = {
	devices: Device[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type DeviceConnectionStatus = {
	deviceId: number;
	online: boolean;
	deviceName?: string;
	serialNumber?: string;
	model?: string;
	firmwareVersion?: string;
};

export type SyncPersonResult = {
	employeeNo: string;
	success: boolean;
	error?: string;
};

export type SyncResult = {
	deviceId: number;
	deviceName: string;
	totalPersons: number;
	synced: number;
	failed: number;
	errors: SyncPersonResult[];
};
