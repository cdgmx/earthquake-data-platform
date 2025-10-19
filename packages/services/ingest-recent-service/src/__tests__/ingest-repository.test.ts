import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@earthquake/utils", () => ({
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

	it("uses DynamoDBDocumentClient.from when inserting an event", async () => {
		const { insertEvent } = await import("../repository.js");

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

		const result = await insertEvent(event);

		expect(result).toBe("inserted");
		expect(documentClientFromMock).toHaveBeenCalledTimes(1);
		expect(putIfNotExistsMock).toHaveBeenCalledWith(
			expect.objectContaining({ send: sendMock }),
			{
				TableName: "earthquake-events",
				Item: event,
				pkAttribute: "pk",
			},
		);
	});

	it("delegates log writes to putItem", async () => {
		const { createRequestLog } = await import("../repository.js");

		const logEntry = {
			pk: "LOG#20251019",
			sk: "1729360000123#550e8400-e29b-41d4-a716-446655440000",
			entity: "LOG",
			requestId: "550e8400-e29b-41d4-a716-446655440000",
			timestamp: 1729360000123,
			route: "/ingest/recent",
			logType: "INGEST",
			status: 200,
			latencyMs: 2847,
			fetched: 100,
			upserted: 100,
			skipped: 0,
			retries: 0,
			params: {},
			ttl: 1729964800,
		};

		await createRequestLog(logEntry);

		expect(documentClientFromMock).toHaveBeenCalledTimes(1);
		expect(putItemMock).toHaveBeenCalledWith(
			expect.objectContaining({ send: sendMock }),
			{
				TableName: "earthquake-events",
				Item: logEntry,
			},
		);
	});

	it("returns skipped when putIfNotExists resolves as skipped", async () => {
		putIfNotExistsMock.mockResolvedValueOnce("skipped");
		const { insertEvent } = await import("../repository.js");

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

		const result = await insertEvent(event);

		expect(result).toBe("skipped");
		expect(putIfNotExistsMock).toHaveBeenCalledTimes(1);
	});
});
