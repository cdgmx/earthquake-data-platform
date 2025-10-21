import { describe, expect, it } from "vitest";
import type { BackendEarthquakeEvent } from "../../types/api";
import { transformBackendEvent, transformBackendEvents } from "../transform";

describe("transform", () => {
	describe("transformBackendEvent", () => {
		it("transforms backend event to display format", () => {
			const backendEvent: BackendEarthquakeEvent = {
				eventId: "us6000lhcx",
				eventTsMs: 1697328000000,
				lat: 37.5,
				lon: -118.8,
				depth: 5.2,
				mag: 3.4,
				place: "California",
				detailUrl:
					"https://earthquake.usgs.gov/earthquakes/eventpage/us6000lhcx",
			};

			const result = transformBackendEvent(backendEvent);

			expect(result).toEqual({
				id: "us6000lhcx",
				magnitude: 3.4,
				place: "California",
				occurredAt: "2023-10-15T00:00:00.000Z",
				detailUrl:
					"https://earthquake.usgs.gov/earthquakes/eventpage/us6000lhcx",
				coordinates: {
					latitude: 37.5,
					longitude: -118.8,
					depthKm: 5.2,
				},
			});
		});

		it("handles null values correctly", () => {
			const backendEvent: BackendEarthquakeEvent = {
				eventId: "test123",
				eventTsMs: 1697328000000,
				lat: null,
				lon: null,
				depth: null,
				mag: null,
				place: null,
				detailUrl: null,
			};

			const result = transformBackendEvent(backendEvent);

			expect(result).toEqual({
				id: "test123",
				magnitude: null,
				place: "Unknown location",
				occurredAt: "2023-10-15T00:00:00.000Z",
				detailUrl: "",
				coordinates: {
					latitude: null,
					longitude: null,
					depthKm: null,
				},
			});
		});
	});

	describe("transformBackendEvents", () => {
		it("transforms array of backend events", () => {
			const backendEvents: BackendEarthquakeEvent[] = [
				{
					eventId: "event1",
					eventTsMs: 1697328000000,
					lat: 37.5,
					lon: -118.8,
					depth: 5.2,
					mag: 3.4,
					place: "California",
					detailUrl: "https://example.com/event1",
				},
				{
					eventId: "event2",
					eventTsMs: 1697414400000,
					lat: 40.0,
					lon: -120.0,
					depth: 10.0,
					mag: 4.5,
					place: "Nevada",
					detailUrl: "https://example.com/event2",
				},
			];

			const result = transformBackendEvents(backendEvents);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("event1");
			expect(result[1].id).toBe("event2");
		});

		it("handles empty array", () => {
			const result = transformBackendEvents([]);
			expect(result).toEqual([]);
		});
	});
});
