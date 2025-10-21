import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	AnalyticsResponse,
	BackendQueryParams,
	BackendQueryResponse,
} from "../../types/api";
import {
	BackendApiError,
	buildAnalyticsUrl,
	buildBackendApiUrl,
	fetchEarthquakesFromBackend,
	fetchPopularFilters,
} from "../backend-client";

describe("backend-client", () => {
	describe("buildBackendApiUrl", () => {
		it("builds URL with required parameters", () => {
			const params: BackendQueryParams = {
				starttime: 1697328000000,
				endtime: 1697414399999,
				minmagnitude: 3.0,
			};

			const url = buildBackendApiUrl("https://api.example.com", params);

			expect(url).toContain("starttime=1697328000000");
			expect(url).toContain("endtime=1697414399999");
			expect(url).toContain("minmagnitude=3");
		});

		it("includes optional parameters when provided", () => {
			const params: BackendQueryParams = {
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-18T23:59:59Z",
				minmagnitude: 3.0,
				pageSize: 50,
				nextToken: "abc123",
			};

			const url = buildBackendApiUrl("https://api.example.com", params);

			expect(url).toContain("pageSize=50");
			expect(url).toContain("nextToken=abc123");
		});
	});

	describe("buildAnalyticsUrl", () => {
		it("builds analytics URL with parameters", () => {
			const url = buildAnalyticsUrl(
				"https://api.example.com",
				"2025-10-21",
				7,
				10,
			);

			expect(url).toContain("day=2025-10-21");
			expect(url).toContain("windowDays=7");
			expect(url).toContain("limit=10");
		});
	});

	describe("fetchEarthquakesFromBackend", () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it("returns earthquake data on success", async () => {
			const mockResponse: BackendQueryResponse = {
				items: [
					{
						eventId: "us6000lhcx",
						eventTsMs: 1697328000000,
						lat: 37.5,
						lon: -118.8,
						depth: 5.2,
						mag: 3.4,
						place: "California",
						detailUrl:
							"https://earthquake.usgs.gov/earthquakes/eventpage/us6000lhcx",
					},
				],
				nextToken: "token123",
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockResponse,
			});

			const params: BackendQueryParams = {
				starttime: 1697328000000,
				endtime: 1697414399999,
				minmagnitude: 3.0,
			};

			const result = await fetchEarthquakesFromBackend(
				"https://api.example.com",
				params,
			);

			expect(result).toEqual(mockResponse);
		});

		it("throws BackendApiError on API error response", async () => {
			const mockError = {
				error: "VALIDATION_ERROR",
				message: "Invalid parameters",
				details: {},
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				json: async () => mockError,
			});

			const params: BackendQueryParams = {
				starttime: 1697328000000,
				endtime: 1697414399999,
				minmagnitude: 3.0,
			};

			await expect(
				fetchEarthquakesFromBackend("https://api.example.com", params),
			).rejects.toThrow(BackendApiError);
		});

		it("throws BackendApiError on invalid response format", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ invalid: "response" }),
			});

			const params: BackendQueryParams = {
				starttime: 1697328000000,
				endtime: 1697414399999,
				minmagnitude: 3.0,
			};

			await expect(
				fetchEarthquakesFromBackend("https://api.example.com", params),
			).rejects.toThrow(BackendApiError);
		});
	});

	describe("fetchPopularFilters", () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it("returns analytics data on success", async () => {
			const mockResponse: AnalyticsResponse = {
				window: {
					startDay: "2025-10-21",
					endDay: "2025-10-21",
				},
				filters: [
					{
						starttime: 1697328000000,
						endtime: 1697414399999,
						minmagnitude: 3.0,
						pageSize: 50,
						hits: 42,
						hasNextTokenCount: 0,
						avgResultCount: 42,
					},
				],
				totalRequests: 100,
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await fetchPopularFilters(
				"https://api.example.com",
				"2025-10-21",
			);

			expect(result).toEqual(mockResponse);
		});

		it("throws BackendApiError on error response", async () => {
			const mockError = {
				error: "INTERNAL_ERROR",
				message: "Something went wrong",
				details: {},
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				json: async () => mockError,
			});

			await expect(
				fetchPopularFilters("https://api.example.com", "2025-10-21"),
			).rejects.toThrow(BackendApiError);
		});
	});
});
