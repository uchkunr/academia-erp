import { type DeviceConfig, HikvisionClient } from "@lib/hikvision";
import { prisma } from "@lib/prisma";

export type SyncPersonResult = {
	synced: number;
	failed: number;
	errors: Array<{ deviceId: number; deviceName: string; error: string }>;
};

export async function syncPersonToAllDevices(
	employeeNo: string,
	name: string,
	faceImage: string,
): Promise<SyncPersonResult> {
	const devices = await prisma.device.findMany({
		where: { isActive: true, type: "FACE_TERMINAL" },
	});

	const result: SyncPersonResult = {
		synced: 0,
		failed: 0,
		errors: [],
	};

	for (const device of devices) {
		const config: DeviceConfig = {
			id: device.id,
			ipAddress: device.ipAddress,
			port: device.port,
			username: device.username,
			password: device.password,
		};
		const client = new HikvisionClient(config);

		try {
			// Try to create person first
			console.log(
				`[Sync] Creating person ${employeeNo} (${name}) on ${device.name}`,
			);
			const createResult = await client.createPerson(employeeNo, name);
			console.log(`[Sync] createPerson result:`, JSON.stringify(createResult));

			if (
				createResult.statusCode !== 1 &&
				createResult.statusString !== "OK" &&
				createResult.subStatusCode !== "deviceUserAlreadyExist"
			) {
				result.failed++;
				result.errors.push({
					deviceId: device.id,
					deviceName: device.name,
					error:
						createResult.errorMsg ||
						createResult.subStatusCode ||
						"Failed to create person",
				});
				continue;
			}

			// If person already exists, update their name
			if (createResult.subStatusCode === "deviceUserAlreadyExist") {
				console.log(
					`[Sync] Person ${employeeNo} already exists on ${device.name}, updating name...`,
				);
				const updateResult = await client.updatePerson(employeeNo, { name });
				console.log(
					`[Sync] updatePerson result:`,
					JSON.stringify(updateResult),
				);
			}

			// Delete old face before uploading new one
			console.log(
				`[Sync] Deleting old face for ${employeeNo} on ${device.name}`,
			);
			await client.deleteFace(employeeNo);

			console.log(`[Sync] Uploading face for ${employeeNo} on ${device.name}`);
			const faceResult = await client.uploadFace(employeeNo, faceImage);
			console.log(`[Sync] uploadFace result:`, JSON.stringify(faceResult));

			if (faceResult.statusCode !== 1 && faceResult.statusString !== "OK") {
				result.failed++;
				result.errors.push({
					deviceId: device.id,
					deviceName: device.name,
					error: faceResult.errorMsg || "Failed to upload face",
				});
				continue;
			}

			result.synced++;
		} catch (error) {
			result.failed++;
			result.errors.push({
				deviceId: device.id,
				deviceName: device.name,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return result;
}
