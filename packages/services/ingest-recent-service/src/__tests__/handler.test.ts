import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handler } from "../handler.js";

vi.mock("../usgs-client.js", () => ({
	fetchRecentEarthquakes: vi.fn(async () => ({
		data: {
			type: "FeatureCollection",
			metadata: {
				generated: 1729353600000,
				url: "https://earthquake.usgs.gov/fdsnws/event/1/query",
				title: "USGS Earthquakes",
				status: 200,
				api: "1.10.3",
				count: 2,
			},
			features: [
				{
					type: "Feature",
					properties: {
						mag: 5.4,
						place: "10 km NW of Los Angeles, CA",
						time: 1729353600000,
						updated: 1729353700000,
						tz: null,
						url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000abcd",
						detail:
							"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=us6000abcd",
						felt: null,
						cdi: null,
						mmi: null,
						alert: null,
						status: "reviewed",
						tsunami: 0,
						sig: 456,
						net: "us",
						code: "6000abcd",
						ids: ",us6000abcd,",
						sources: ",us,",
						types: ",origin,phase-data,",
						nst: null,
						dmin: null,
						rms: 0.89,
						gap: null,
						magType: "mb",
						type: "earthquake",
						title: "M 5.4 - 10 km NW of Los Angeles, CA",
					},
					geometry: {
						type: "Point",
						coordinates: [-118.456, 34.123, 12.5],
					},
					id: "us6000abcd",
				},
				{
					type: "Feature",
					properties: {
						mag: 3.2,
						place: "5 km S of San Francisco, CA",
						time: 1729353500000,
						updated: 1729353600000,
						tz: null,
						url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000abce",
						detail:
							"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=us6000abce",
						felt: null,
						cdi: null,
						mmi: null,
						alert: null,
						status: "reviewed",
						tsunami: 0,
						sig: 123,
						net: "us",
						code: "6000abce",
						ids: ",us6000abce,",
						sources: ",us,",
						types: ",origin,phase-data,",
						nst: null,
						dmin: null,
						rms: 0.67,
						gap: null,
						magType: "ml",
						type: "earthquake",
						title: "M 3.2 - 5 km S of San Francisco, CA",
					},
					geometry: {
						type: "Point",
						coordinates: [-122.419, 37.774, 8.3],
					},
					id: "us6000abce",
				},
			],
		},
		retries: 0,
	})),
}));

vi.mock("../repository.js", () => ({
	insertEvent: vi.fn(async () => "inserted"),
	createIngestRequestLog: vi.fn(async () => {}),
}));

describe("handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 200 with ingestion summary", async () => {
		const event = {
			httpMethod: "POST",
			path: "/ingest/recent",
			body: null,
		} as APIGatewayProxyEvent;

		const context = {} as Context;

		const result = await handler(event, context);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body).toMatchObject({
			fetched: 2,
			upserted: 2,
			skipped: 0,
			retries: 0,
		});
	});

	it("should handle duplicate events correctly", async () => {
		const { insertEvent } = await import("../repository.js");

		let callCount = 0;
		(insertEvent as ReturnType<typeof vi.fn>).mockImplementation(async () => {
			callCount++;
			return callCount === 1 ? "inserted" : "skipped";
		});

		const event = {
			httpMethod: "POST",
			path: "/ingest/recent",
			body: null,
		} as APIGatewayProxyEvent;

		const context = {} as Context;

		const result = await handler(event, context);

		expect(result.statusCode).toBe(200);
		const body = JSON.parse(result.body);
		expect(body.fetched).toBe(2);
		expect(body.upserted).toBeGreaterThanOrEqual(0);
		expect(body.skipped).toBeGreaterThanOrEqual(0);
	});

	it("should return 503 when USGS is unavailable", async () => {
		const { fetchRecentEarthquakes } = await import("../usgs-client.js");
		(fetchRecentEarthquakes as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error("USGS API unavailable"),
		);

		const event = {
			httpMethod: "POST",
			path: "/ingest/recent",
			body: null,
		} as APIGatewayProxyEvent;

		const context = {} as Context;

		const result = await handler(event, context);

		expect(result.statusCode).toBe(503);
		const body = JSON.parse(result.body);
		expect(body.error).toBe("USGS_UNAVAILABLE");
	});

	it("should return 502 for malformed USGS responses", async () => {
		const { fetchRecentEarthquakes } = await import("../usgs-client.js");
		(fetchRecentEarthquakes as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error("Invalid JSON"),
		);

		const event = {
			httpMethod: "POST",
			path: "/ingest/recent",
			body: null,
		} as APIGatewayProxyEvent;

		const context = {} as Context;

		const result = await handler(event, context);

		expect(result.statusCode).toBeGreaterThanOrEqual(500);
		const body = JSON.parse(result.body);
		expect(body.error).toBeDefined();
	});
});
