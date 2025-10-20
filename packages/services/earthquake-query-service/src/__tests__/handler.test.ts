import type { APIGatewayProxyEvent } from "aws-lambda";
import { beforeEach, describe, expect, it } from "vitest";
import { handler } from "../handler.js";

describe("handler integration", () => {
	const mockEvent = (
		queryParams: Record<string, string>,
	): APIGatewayProxyEvent => ({
		queryStringParameters: queryParams,
		httpMethod: "GET",
		path: "/earthquakes",
		headers: {},
		multiValueHeaders: {},
		pathParameters: null,
		stageVariables: null,
		requestContext: {} as APIGatewayProxyEvent["requestContext"],
		resource: "",
		body: null,
		isBase64Encoded: false,
		multiValueQueryStringParameters: null,
	});

	beforeEach(() => {
		process.env.TABLE_NAME = "earthquake-events";
		process.env.NEXT_TOKEN_SECRET = "test-secret-key";
	});

	describe("validation", () => {
		it("should return 503 if TABLE_NAME missing", async () => {
			delete process.env.TABLE_NAME;
			const event = mockEvent({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: "3.0",
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(503);
			const body = JSON.parse(result.body);
			expect(body.error).toBe("INFRASTRUCTURE_NOT_READY");
		});

		it("should return 503 if NEXT_TOKEN_SECRET missing", async () => {
			delete process.env.NEXT_TOKEN_SECRET;
			const event = mockEvent({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: "3.0",
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(503);
			const body = JSON.parse(result.body);
			expect(body.error).toBe("INFRASTRUCTURE_NOT_READY");
		});

		it("should return 400 for invalid starttime format", async () => {
			const event = mockEvent({
				starttime: "not-a-date",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: "3.0",
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body.error).toBe("VALIDATION_ERROR");
		});

		it("should return 400 for endtime before starttime", async () => {
			const event = mockEvent({
				starttime: "2025-10-18T00:00:00Z",
				endtime: "2025-10-15T00:00:00Z",
				minmagnitude: "3.0",
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body.error).toBe("VALIDATION_ERROR");
		});

		it("should return 400 for pageSize > 100", async () => {
			const event = mockEvent({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: "3.0",
				pageSize: "150",
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body.error).toBe("VALIDATION_ERROR");
		});

		it("should return 400 for negative minmagnitude", async () => {
			const event = mockEvent({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: "-5.0",
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(400);
			const body = JSON.parse(result.body);
			expect(body.error).toBe("VALIDATION_ERROR");
		});
	});

	describe("empty results", () => {
		it.skip("should return 200 with empty items array when no events match (requires DynamoDB)", async () => {
			const event = mockEvent({
				starttime: "2025-01-01T00:00:00Z",
				endtime: "2025-01-02T00:00:00Z",
				minmagnitude: "3.0",
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			const body = JSON.parse(result.body);
			expect(body.items).toEqual([]);
			expect(body.nextToken).toBeUndefined();
		});
	});
});
