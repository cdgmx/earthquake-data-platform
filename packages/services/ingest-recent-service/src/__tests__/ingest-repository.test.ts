import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.AWS_REGION = "us-east-1";
process.env.TABLE_NAME = "earthquake-events";

const sendMock = vi.fn();
const documentClientFromMock = vi.fn(() => ({
	send: sendMock,
}));

const putIfNotExistsMock = vi.fn(async () => "inserted");
const putItemMock = vi.fn(async () => undefined);

vi.mock("@aws-sdk/client-dynamodb", () => ({
	DynamoDBClient: vi.fn(() => ({ send: vi.fn() })),
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
	DynamoDBDocumentClient: {
		from: documentClientFromMock,
	},
	PutCommand: vi.fn(),
}));

vi.mock("@earthquake/dynamo-client", () => ({
	putIfNotExists: putIfNotExistsMock,
	putItem: putItemMock,
}));

describe("ingest-repository", () => {
	beforeEach(() => {
		vi.resetModules();
		sendMock.mockReset();
		documentClientFromMock.mockClear();
		putIfNotExistsMock.mockReset();
		putItemMock.mockReset();
		putIfNotExistsMock.mockResolvedValue("inserted");
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("calls putIfNotExists with correct parameters when inserting an event", async () => {
		const { insertEvent } = await import("../repository.js");

		const mockDocClient = {
			send: sendMock,
		} as unknown as DynamoDBDocumentClient;
		const event = {
			pk: "EVENT#us6000abcd",
			sk: "EVENT",
			entity: "EVENT",
			eventId: "us6000abcd",
			eventTsMs: 1729353600000,
			mag: 5.4,
			place: "10 km NW of Los Angeles, CA",
			lat: 34.123,
			lon: -118.456,
			depth: 12.5,
			dayBucket: "20251019",
			gsi1pk: "DAY#20251019",
			gsi1sk: 1729353600000,
			source: "USGS",
			ingestedAt: 1729353600100,
		};

		const result = await insertEvent({
			event,
			docClient: mockDocClient,
			tableName: "earthquake-events",
		});

		expect(result).toBe("inserted");
		expect(putIfNotExistsMock).toHaveBeenCalledWith(mockDocClient, {
			TableName: "earthquake-events",
			Item: event,
			pkAttribute: "pk",
		});
	});

	it("delegates log writes to putItem", async () => {
		const { createIngestRequestLog } = await import("../repository.js");

		const mockDocClient = {
			send: sendMock,
		} as unknown as DynamoDBDocumentClient;
		const logInput = {
			requestId: "550e8400-e29b-41d4-a716-446655440000",
			timestamp: 1729360000123,
			route: "/ingest/recent",
			status: 200,
			latencyMs: 2847,
			fetched: 100,
			upserted: 100,
			skipped: 0,
			retries: 0,
		};

		await createIngestRequestLog({
			logInput,
			docClient: mockDocClient,
			tableName: "earthquake-logs",
		});

		expect(putItemMock).toHaveBeenCalledWith(mockDocClient, {
			TableName: "earthquake-logs",
			Item: expect.objectContaining({
				pk: "LOG#20241019",
				sk: expect.stringContaining("1729360000123#"),
				gsi1pk: "LOG#20241019",
				gsi1sk: 1729360000123,
				entity: "LOG",
				requestId: logInput.requestId,
				timestamp: logInput.timestamp,
				route: logInput.route,
				status: logInput.status,
				latencyMs: logInput.latencyMs,
				fetched: logInput.fetched,
				upserted: logInput.upserted,
				skipped: logInput.skipped,
				retries: logInput.retries,
				ttl: expect.any(Number),
				logType: "INGEST",
			}),
		});
	});

	it("returns skipped when putIfNotExists resolves as skipped", async () => {
		putIfNotExistsMock.mockResolvedValueOnce("skipped");
		const { insertEvent } = await import("../repository.js");

		const mockDocClient = {
			send: sendMock,
		} as unknown as DynamoDBDocumentClient;
		const event = {
			pk: "EVENT#us6000abcd",
			sk: "EVENT",
			entity: "EVENT",
			eventId: "us6000abcd",
			eventTsMs: 1729353600000,
			mag: 5.4,
			place: "10 km NW of Los Angeles, CA",
			lat: 34.123,
			lon: -118.456,
			depth: 12.5,
			dayBucket: "20241019",
			gsi1pk: "DAY#20241019",
			gsi1sk: 1729353600000,
			source: "USGS",
			ingestedAt: 1729353600100,
		};

		const result = await insertEvent({
			event,
			docClient: mockDocClient,
			tableName: "earthquake-events",
		});

		expect(result).toBe("skipped");
		expect(putIfNotExistsMock).toHaveBeenCalledTimes(1);
	});
});
