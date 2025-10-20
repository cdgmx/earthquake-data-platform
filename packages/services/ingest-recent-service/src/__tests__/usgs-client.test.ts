import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRecentEarthquakes } from "../usgs-client.js";

global.fetch = vi.fn();

describe("usgs-client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should fetch recent earthquakes from USGS API", async () => {
		const mockResponse = {
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
						rms: 0.45,
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
						coordinates: [-122.456, 37.723, 8.2],
					},
					id: "us6000abce",
				},
			],
		};

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => mockResponse,
		} as Response);

		const usgsUrl =
			"https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&limit=100";
		const result = await fetchRecentEarthquakes(usgsUrl);

		expect(global.fetch).toHaveBeenCalledWith(usgsUrl);
		expect(result.data).toEqual(mockResponse);
		expect(result.retries).toBe(0);
	});

	it("should retry on 5xx errors with exponential backoff", async () => {
		const mockResponse = {
			type: "FeatureCollection",
			metadata: {
				generated: 1729353600000,
				url: "https://earthquake.usgs.gov/fdsnws/event/1/query",
				title: "USGS Earthquakes",
				status: 200,
				api: "1.10.3",
				count: 1,
			},
			features: [],
		};

		(global.fetch as ReturnType<typeof vi.fn>)
			.mockRejectedValueOnce(new Error("Network error"))
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockResponse,
			} as Response);

		const startTime = Date.now();
		const result = await fetchRecentEarthquakes();
		const elapsed = Date.now() - startTime;

		expect(result.retries).toBe(2);
		expect(result.data).toEqual(mockResponse);
		// With jitter (±25%), minimum delay is (1000 + 2000) * 0.75 = 2250ms
		expect(elapsed).toBeGreaterThanOrEqual(2250);
	});

	it("should throw after exhausting retries", async () => {
		(global.fetch as ReturnType<typeof vi.fn>)
			.mockRejectedValueOnce(new Error("Network error"))
			.mockRejectedValueOnce(new Error("Network error"))
			.mockRejectedValueOnce(new Error("Network error"))
			.mockRejectedValueOnce(new Error("Network error"));

		await expect(fetchRecentEarthquakes()).rejects.toThrow();
	}, 10000);

	it("should retry on 429 rate limit errors", async () => {
		const mockResponse = {
			type: "FeatureCollection",
			metadata: {
				generated: 1729353600000,
				url: "https://earthquake.usgs.gov/fdsnws/event/1/query",
				title: "USGS Earthquakes",
				status: 200,
				api: "1.10.3",
				count: 1,
			},
			features: [],
		};

		(global.fetch as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockResponse,
			} as Response);

		const result = await fetchRecentEarthquakes();

		expect(result.retries).toBe(1);
		expect(result.data).toEqual(mockResponse);
	}, 10000);
});
