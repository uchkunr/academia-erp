process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import crypto from "node:crypto";
import fs from "node:fs";

export type DeviceConfig = {
	id: number;
	ipAddress: string;
	port: number;
	username: string;
	password: string;
};

export type HikvisionResponse = {
	statusCode?: number;
	statusString?: string;
	subStatusCode?: string;
	errorCode?: number;
	errorMsg?: string;
};

export type AcsEventInfo = {
	time?: string;
	name?: string;
	employeeNoString?: string;
	currentVerifyMode?: string;
	attendanceStatus?: string;
	serialNo?: number;
	major?: number;
	minor?: number;
	pictureURL?: string;
};

export type AcsEventResult = {
	AcsEvent?: {
		totalMatches?: number;
		searchID?: string;
		responseStatusStrg?: string;
		numOfMatches?: number;
		InfoList?: AcsEventInfo[];
	};
};

export type UserInfo = {
	employeeNo: string;
	name?: string;
	userType?: string;
	Valid?: {
		enable: boolean;
		beginTime: string;
		endTime: string;
	};
	doorRight?: string;
	RightPlan?: Array<{ doorNo: number; planTemplateNo: string }>;
};

export type UserInfoSearchResult = {
	UserInfoSearch?: {
		totalMatches?: number;
		numOfMatches?: number;
		UserInfo?: UserInfo[];
	};
};

export type DeviceInfo = {
	deviceName?: string;
	deviceID?: string;
	model?: string;
	serialNumber?: string;
	firmwareVersion?: string;
	macAddress?: string;
};

type DigestParams = {
	realm: string;
	nonce: string;
	qop?: string;
	opaque?: string;
};

class DigestAuth {
	private username: string;
	private password: string;
	private nc: number;

	constructor(username: string, password: string) {
		this.username = username;
		this.password = password;
		this.nc = 0;
	}

	private md5(data: string): string {
		return crypto.createHash("md5").update(data).digest("hex");
	}

	private parseDigestHeader(header: string): DigestParams | null {
		const params: Record<string, string> = {};
		const regex = /(\w+)=(?:"([^"]*)"|([^\s,]+))/g;
		const matches = header.matchAll(regex);

		for (const match of matches) {
			params[match[1]] = match[2] ?? match[3];
		}

		if (!params.realm || !params.nonce) {
			return null;
		}

		return {
			realm: params.realm,
			nonce: params.nonce,
			qop: params.qop,
			opaque: params.opaque,
		};
	}

	private generateCnonce(): string {
		return crypto.randomBytes(8).toString("hex");
	}

	private createAuthHeader(
		method: string,
		uri: string,
		params: DigestParams,
	): string {
		this.nc++;
		const ncString = this.nc.toString(16).padStart(8, "0");
		const cnonce = this.generateCnonce();

		const ha1 = this.md5(`${this.username}:${params.realm}:${this.password}`);
		const ha2 = this.md5(`${method}:${uri}`);

		let response: string;
		if (params.qop) {
			response = this.md5(
				`${ha1}:${params.nonce}:${ncString}:${cnonce}:${params.qop}:${ha2}`,
			);
		} else {
			response = this.md5(`${ha1}:${params.nonce}:${ha2}`);
		}

		let authHeader = `Digest username="${this.username}", realm="${params.realm}", nonce="${params.nonce}", uri="${uri}", response="${response}"`;

		if (params.qop) {
			authHeader += `, qop=${params.qop}, nc=${ncString}, cnonce="${cnonce}"`;
		}

		if (params.opaque) {
			authHeader += `, opaque="${params.opaque}"`;
		}

		return authHeader;
	}

	async fetch(url: string, options: RequestInit = {}): Promise<Response> {
		const firstResponse = await fetch(url, {
			...options,
			headers: {
				...options.headers,
			},
		});

		console.log(`[DigestAuth] First response: ${firstResponse.status}`);

		if (firstResponse.status !== 401) {
			return firstResponse;
		}

		const authHeader = firstResponse.headers.get("www-authenticate");
		// Consume first response body to properly close connection
		await firstResponse.text();
		console.log(`[DigestAuth] WWW-Authenticate:`, authHeader);

		if (!authHeader?.toLowerCase().startsWith("digest")) {
			return firstResponse;
		}

		const params = this.parseDigestHeader(authHeader);
		console.log(`[DigestAuth] Parsed params:`, JSON.stringify(params));

		if (!params) {
			return firstResponse;
		}

		const urlObj = new URL(url);
		const uri = urlObj.pathname + urlObj.search;
		const method = options.method || "GET";

		const authorization = this.createAuthHeader(method, uri, params);
		console.log(`[DigestAuth] Authorization:`, authorization);

		const secondResponse = await fetch(url, {
			...options,
			headers: {
				...options.headers,
				Authorization: authorization,
			},
		});

		console.log(`[DigestAuth] Second response: ${secondResponse.status}`);
		if (secondResponse.status === 401) {
			const body = await secondResponse.text();
			if (body.includes("lockStatus")) {
				console.log(
					`[DigestAuth] Device lock info:`,
					body.match(/<lockStatus>(.*?)<\/lockStatus>/)?.[1],
					`unlockTime:`,
					body.match(/<unlockTime>(.*?)<\/unlockTime>/)?.[1],
				);
			}
			// Return a new Response since body was consumed
			return new Response(body, {
				status: 401,
				headers: secondResponse.headers,
			});
		}
		return secondResponse;
	}
}

export class HikvisionClient {
	private client: DigestAuth;
	private baseUrl: string;
	private deviceId: number;

	constructor(config: DeviceConfig) {
		this.deviceId = config.id;
		const protocol = config.port === 443 ? "https" : "http";
		const defaultPort = protocol === "https" ? 443 : 80;
		this.baseUrl =
			config.port === defaultPort
				? `${protocol}://${config.ipAddress}`
				: `${protocol}://${config.ipAddress}:${config.port}`;
		this.client = new DigestAuth(config.username, config.password);
		console.log(
			`[Hikvision] Client created: ${config.username} @ ${this.baseUrl}`,
		);
		console.log(
			`[Hikvision] Password chars:`,
			JSON.stringify([...config.password].map((c) => c.charCodeAt(0))),
		);
	}

	private formatDate(d: Date): string {
		return d.toISOString().slice(0, 19);
	}

	async checkConnection(): Promise<{ online: boolean; info?: DeviceInfo }> {
		const url = `${this.baseUrl}/ISAPI/System/deviceInfo`;

		try {
			console.log(
				`[Hikvision] Checking connection for device ${this.deviceId}: GET ${url}`,
			);
			const response = await this.client.fetch(url, {
				method: "GET",
			});

			if (!response.ok) {
				console.log(`[Hikvision] Connection check failed (${response.status})`);
				return { online: false };
			}

			const text = await response.text();
			console.log(
				`[Hikvision] Device ${this.deviceId} response:`,
				text.substring(0, 200),
			);

			// Try JSON first, then parse XML
			let info: DeviceInfo | undefined;
			try {
				const json = JSON.parse(text) as { DeviceInfo?: DeviceInfo };
				info = json.DeviceInfo;
			} catch {
				// Parse XML response
				const get = (tag: string) =>
					text.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1];
				info = {
					deviceName: get("deviceName"),
					deviceID: get("deviceID"),
					model: get("model"),
					serialNumber: get("serialNumber"),
					firmwareVersion: get("firmwareVersion"),
					macAddress: get("macAddress"),
				};
			}

			console.log(
				`[Hikvision] Device ${this.deviceId} online:`,
				info?.deviceName,
				info?.model,
			);
			return { online: true, info };
		} catch (error) {
			console.error(
				`[Hikvision] Connection check error for device ${this.deviceId}:`,
				error,
			);
			return { online: false };
		}
	}

	async getAccessEvents(
		options: {
			startTime?: Date;
			endTime?: Date;
			maxResults?: number;
			major?: number;
			minor?: number;
		} = {},
	): Promise<AcsEventResult | null> {
		const url = `${this.baseUrl}/ISAPI/AccessControl/AcsEvent?format=json`;
		const endTime = options.endTime || new Date();
		const startTime =
			options.startTime || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const body = {
			AcsEventCond: {
				searchID: `${this.deviceId}-${Date.now()}`,
				searchResultPosition: 0,
				maxResults: options.maxResults || 100,
				major: options.major || 5,
				minor: options.minor || 75,
				startTime: this.formatDate(startTime),
				endTime: this.formatDate(endTime),
			},
		};

		try {
			const response = await this.client.fetch(url, {
				method: "POST",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});
			return (await response.json()) as AcsEventResult;
		} catch {
			return null;
		}
	}

	async getPersons(
		options: { maxResults?: number; position?: number } = {},
	): Promise<UserInfoSearchResult | null> {
		const url = `${this.baseUrl}/ISAPI/AccessControl/UserInfo/Search?format=json`;
		const body = {
			UserInfoSearchCond: {
				searchID: `${this.deviceId}-${Date.now()}`,
				searchResultPosition: options.position || 0,
				maxResults: options.maxResults || 100,
			},
		};

		try {
			const response = await this.client.fetch(url, {
				method: "POST",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) return null;
			return (await response.json()) as UserInfoSearchResult;
		} catch {
			return null;
		}
	}

	async getPerson(employeeNo: string): Promise<UserInfo | null> {
		const url = `${this.baseUrl}/ISAPI/AccessControl/UserInfo/Search?format=json`;
		const body = {
			UserInfoSearchCond: {
				searchID: `${this.deviceId}-${Date.now()}`,
				EmployeeNoList: [{ employeeNo }],
			},
		};

		try {
			const response = await this.client.fetch(url, {
				method: "POST",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) return null;
			const result = (await response.json()) as UserInfoSearchResult;
			return result.UserInfoSearch?.UserInfo?.[0] || null;
		} catch {
			return null;
		}
	}

	async createPerson(
		employeeNo: string,
		name: string,
		options: {
			userType?: string;
			beginTime?: string;
			endTime?: string;
		} = {},
	): Promise<HikvisionResponse> {
		const url = `${this.baseUrl}/ISAPI/AccessControl/UserInfo/Record?format=json`;
		const doorRight = "1";
		const body = {
			UserInfo: {
				employeeNo,
				name,
				userType: options.userType || "normal",
				Valid: {
					enable: true,
					beginTime: options.beginTime || "2024-01-01T00:00:00",
					endTime: options.endTime || "2030-12-31T23:59:59",
				},
				doorRight,
				RightPlan: [{ doorNo: 1, planTemplateNo: "1" }],
			},
		};

		try {
			const response = await this.client.fetch(url, {
				method: "POST",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});
			const result = (await response.json()) as HikvisionResponse;
			if (!response.ok) {
				console.error(
					`[Hikvision] createPerson failed (${response.status}):`,
					JSON.stringify(result),
				);
			}
			return result;
		} catch (error) {
			return {
				statusCode: 0,
				errorMsg: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async updatePerson(
		employeeNo: string,
		data: Partial<UserInfo>,
	): Promise<HikvisionResponse> {
		const url = `${this.baseUrl}/ISAPI/AccessControl/UserInfo/Modify?format=json`;
		const body = {
			UserInfo: {
				employeeNo,
				...data,
			},
		};

		try {
			const response = await this.client.fetch(url, {
				method: "PUT",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});
			return (await response.json()) as HikvisionResponse;
		} catch (error) {
			return {
				statusCode: 0,
				errorMsg: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async deletePerson(employeeNo: string): Promise<HikvisionResponse> {
		const url = `${this.baseUrl}/ISAPI/AccessControl/UserInfo/Delete?format=json`;
		const body = {
			UserInfoDelCond: {
				EmployeeNoList: [{ employeeNo }],
			},
		};

		try {
			const response = await this.client.fetch(url, {
				method: "PUT",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});
			return (await response.json()) as HikvisionResponse;
		} catch (error) {
			return {
				statusCode: 0,
				errorMsg: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async uploadFace(
		employeeNo: string,
		imageData: Buffer | string,
	): Promise<HikvisionResponse> {
		const url = `${this.baseUrl}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;

		let imageBuffer: Buffer;
		if (typeof imageData === "string") {
			if (imageData.startsWith("data:image")) {
				const base64Data = imageData.split(",")[1];
				imageBuffer = Buffer.from(base64Data, "base64");
			} else if (fs.existsSync(imageData)) {
				imageBuffer = fs.readFileSync(imageData);
			} else {
				imageBuffer = Buffer.from(imageData, "base64");
			}
		} else {
			imageBuffer = imageData;
		}

		const boundary = `---------------${Date.now().toString(16)}`;
		const faceDataRecord = JSON.stringify({
			faceLibType: "blackFD",
			FDID: "1",
			FPID: employeeNo,
		});

		const CRLF = "\r\n";
		const jsonPart =
			`--${boundary}${CRLF}` +
			`Content-Disposition: form-data; name="FaceDataRecord";${CRLF}` +
			`Content-Type: application/json${CRLF}` +
			`Content-Length: ${faceDataRecord.length}${CRLF}${CRLF}` +
			faceDataRecord;

		const imagePart =
			`${CRLF}--${boundary}${CRLF}` +
			`Content-Disposition: form-data; name="FaceImage";${CRLF}` +
			`Content-Type: image/jpeg${CRLF}` +
			`Content-Length: ${imageBuffer.length}${CRLF}${CRLF}`;

		const closingBoundary = `${CRLF}--${boundary}--${CRLF}`;

		const body = Buffer.concat([
			Buffer.from(jsonPart, "utf-8"),
			Buffer.from(imagePart, "utf-8"),
			imageBuffer,
			Buffer.from(closingBoundary, "utf-8"),
		]);

		try {
			const response = await this.client.fetch(url, {
				method: "POST",
				body,
				headers: {
					"Content-Type": `multipart/form-data; boundary=${boundary}`,
					"Content-Length": body.length.toString(),
				},
			});
			return (await response.json()) as HikvisionResponse;
		} catch (error) {
			return {
				statusCode: 0,
				errorMsg: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async searchFace(employeeNo: string): Promise<{ faceURL?: string } | null> {
		const url = `${this.baseUrl}/ISAPI/Intelligent/FDLib/FDSearch?format=json`;
		const body = {
			searchResultPosition: 0,
			maxResults: 1,
			faceLibType: "blackFD",
			FDID: "1",
			FPID: employeeNo,
		};

		try {
			const response = await this.client.fetch(url, {
				method: "POST",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) return null;
			const result = (await response.json()) as {
				MatchList?: { faceURL?: string }[];
			};
			const matchList = result?.MatchList;
			if (matchList && matchList.length > 0) {
				return { faceURL: matchList[0].faceURL };
			}
			return null;
		} catch {
			return null;
		}
	}

	async deleteFace(employeeNo: string): Promise<HikvisionResponse> {
		const url = `${this.baseUrl}/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD`;
		const body = {
			FPID: [{ value: employeeNo }],
		};

		try {
			const response = await this.client.fetch(url, {
				method: "PUT",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});
			return (await response.json()) as HikvisionResponse;
		} catch (error) {
			return {
				statusCode: 0,
				errorMsg: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async downloadFace(faceURL: string): Promise<Buffer | null> {
		const cleanUrl = faceURL.split("@")[0];

		try {
			const response = await this.client.fetch(cleanUrl, { method: "GET" });
			if (!response.ok) return null;
			return Buffer.from(await response.arrayBuffer());
		} catch {
			return null;
		}
	}

	async openDoor(doorNo: number = 1): Promise<HikvisionResponse> {
		const url = `${this.baseUrl}/ISAPI/AccessControl/RemoteControl/door/${doorNo}`;
		const body = {
			RemoteControlDoor: {
				cmd: "open",
			},
		};

		try {
			console.log(
				`[Hikvision] Opening door ${doorNo} on device ${this.deviceId}: PUT ${url}`,
			);
			const response = await this.client.fetch(url, {
				method: "PUT",
				body: JSON.stringify(body),
				headers: { "Content-Type": "application/json" },
			});

			const text = await response.text();
			console.log(`[Hikvision] Open door response (${response.status}):`, text);

			try {
				return JSON.parse(text) as HikvisionResponse;
			} catch {
				return {
					statusCode: response.ok ? 1 : 0,
					statusString: response.ok ? "OK" : "Error",
					errorMsg: response.ok ? undefined : text,
				};
			}
		} catch (error) {
			console.error(`[Hikvision] Open door error:`, error);
			return {
				statusCode: 0,
				errorMsg: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async getCapabilities(): Promise<Record<string, unknown> | null> {
		const url = `${this.baseUrl}/ISAPI/AccessControl/capabilities?format=json`;

		try {
			const response = await this.client.fetch(url, {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});
			if (!response.ok) return null;
			return (await response.json()) as Record<string, unknown>;
		} catch {
			return null;
		}
	}

	async reboot(): Promise<HikvisionResponse> {
		const url = `${this.baseUrl}/ISAPI/System/reboot?format=json`;

		try {
			console.log(`[Hikvision] Rebooting device ${this.deviceId}: PUT ${url}`);
			const response = await this.client.fetch(url, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
			});

			const text = await response.text();
			console.log(`[Hikvision] Reboot response (${response.status}):`, text);

			try {
				return JSON.parse(text) as HikvisionResponse;
			} catch {
				return {
					statusCode: response.ok ? 1 : 0,
					statusString: response.ok ? "OK" : "Error",
					errorMsg: response.ok ? undefined : text,
				};
			}
		} catch (error) {
			console.error(`[Hikvision] Reboot error:`, error);
			return {
				statusCode: 0,
				errorMsg: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}

export function createHikvisionClient(config: DeviceConfig): HikvisionClient {
	return new HikvisionClient(config);
}
