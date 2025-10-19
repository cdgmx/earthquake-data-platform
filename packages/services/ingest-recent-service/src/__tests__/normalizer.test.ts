import { describe, expect, it } from "vitest";
import { normalizeEarthquakeEvent } from "../normalizer.js";
import type { USGSFeature } from "../schemas.js";

describe("normalizer", () => {
	it("should normalize USGS GeoJSON feature to EarthquakeEvent", () => {
		const usgsFeature: USGSFeature = {
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
		};

		const result = normalizeEarthquakeEvent(usgsFeature);

		expect(result).toMatchObject({
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
		});
		expect(result.ingestedAt).toBeGreaterThan(0);
	});

	it("should handle missing depth as null", () => {
		const usgsFeature: USGSFeature = {
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
				coordinates: [-122.419, 37.774, 0],
			},
			id: "us6000abce",
		};

		const result = normalizeEarthquakeEvent(usgsFeature);

		expect(result.depth).toBe(0);
	});

	it("should calculate day bucket correctly", () => {
		const usgsFeature: USGSFeature = {
			type: "Feature",
			properties: {
				mag: 4.1,
				place: "Test Location",
				time: 1729353600000,
				updated: 1729353700000,
				tz: null,
				url: "https://earthquake.usgs.gov/earthquakes/eventpage/test123",
				detail:
					"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=test123",
				felt: null,
				cdi: null,
				mmi: null,
				alert: null,
				status: "reviewed",
				tsunami: 0,
				sig: 300,
				net: "us",
				code: "test123",
				ids: ",test123,",
				sources: ",us,",
				types: ",origin,",
				nst: null,
				dmin: null,
				rms: 0.5,
				gap: null,
				magType: "mb",
				type: "earthquake",
				title: "M 4.1 - Test Location",
			},
			geometry: {
				type: "Point",
				coordinates: [0, 0, 10],
			},
			id: "test123",
		};

		const result = normalizeEarthquakeEvent(usgsFeature);

		expect(result.dayBucket).toBe("20241019");
		expect(result.gsi1pk).toBe("DAY#20241019");
	});

	it("should validate required fields and throw on invalid data", () => {
		const invalidFeature = {
			type: "Feature",
			properties: {
				mag: null,
				place: "Test Location",
				time: 1729353600000,
			},
			geometry: {
				type: "Point",
				coordinates: [200, 100, 10],
			},
			id: "test123",
		} as unknown as USGSFeature;

		expect(() => normalizeEarthquakeEvent(invalidFeature)).toThrow();
	});

	it("should handle edge case coordinates", () => {
		const edgeCaseFeature: USGSFeature = {
			type: "Feature",
			properties: {
				mag: 4.5,
				place: "Edge Location",
				time: 1729353600000,
				updated: 1729353700000,
				tz: null,
				url: "https://earthquake.usgs.gov/earthquakes/eventpage/edge123",
				detail:
					"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=edge123",
				felt: null,
				cdi: null,
				mmi: null,
				alert: null,
				status: "reviewed",
				tsunami: 0,
				sig: 300,
				net: "us",
				code: "edge123",
				ids: ",edge123,",
				sources: ",us,",
				types: ",origin,",
				nst: null,
				dmin: null,
				rms: 0.5,
				gap: null,
				magType: "mb",
				type: "earthquake",
				title: "M 4.5 - Edge Location",
			},
			geometry: {
				type: "Point",
				coordinates: [-180, -90, 0],
			},
			id: "edge123",
		};

		const result = normalizeEarthquakeEvent(edgeCaseFeature);

		expect(result.lon).toBe(-180);
		expect(result.lat).toBe(-90);
		expect(result.depth).toBe(0);
	});

	it("should throw on invalid longitude > 180", () => {
		const invalidFeature = {
			type: "Feature",
			properties: {
				mag: 4.5,
				place: "Invalid Location",
				time: 1729353600000,
				updated: 1729353700000,
				tz: null,
				url: "https://earthquake.usgs.gov/earthquakes/eventpage/invalid",
				detail:
					"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=invalid",
				felt: null,
				cdi: null,
				mmi: null,
				alert: null,
				status: "reviewed",
				tsunami: 0,
				sig: 300,
				net: "us",
				code: "invalid",
				ids: ",invalid,",
				sources: ",us,",
				types: ",origin,",
				nst: null,
				dmin: null,
				rms: 0.5,
				gap: null,
				magType: "mb",
				type: "earthquake",
				title: "M 4.5 - Invalid Location",
			},
			geometry: {
				type: "Point",
				coordinates: [181, 45, 10],
			},
			id: "invalid",
		} as USGSFeature;

		expect(() => normalizeEarthquakeEvent(invalidFeature)).toThrow(
			"Invalid longitude: 181",
		);
	});

	it("should throw on invalid latitude > 90", () => {
		const invalidFeature = {
			type: "Feature",
			properties: {
				mag: 4.5,
				place: "Invalid Location",
				time: 1729353600000,
				updated: 1729353700000,
				tz: null,
				url: "https://earthquake.usgs.gov/earthquakes/eventpage/invalid",
				detail:
					"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=invalid",
				felt: null,
				cdi: null,
				mmi: null,
				alert: null,
				status: "reviewed",
				tsunami: 0,
				sig: 300,
				net: "us",
				code: "invalid",
				ids: ",invalid,",
				sources: ",us,",
				types: ",origin,",
				nst: null,
				dmin: null,
				rms: 0.5,
				gap: null,
				magType: "mb",
				type: "earthquake",
				title: "M 4.5 - Invalid Location",
			},
			geometry: {
				type: "Point",
				coordinates: [45, 91, 10],
			},
			id: "invalid",
		} as USGSFeature;

		expect(() => normalizeEarthquakeEvent(invalidFeature)).toThrow(
			"Invalid latitude: 91",
		);
	});

	it("should clamp magnitude < -2.0 to -2.0", () => {
		const lowMagFeature: USGSFeature = {
			type: "Feature",
			properties: {
				mag: -5.0,
				place: "Low Mag Location",
				time: 1729353600000,
				updated: 1729353700000,
				tz: null,
				url: "https://earthquake.usgs.gov/earthquakes/eventpage/lowmag",
				detail:
					"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=lowmag",
				felt: null,
				cdi: null,
				mmi: null,
				alert: null,
				status: "reviewed",
				tsunami: 0,
				sig: 10,
				net: "us",
				code: "lowmag",
				ids: ",lowmag,",
				sources: ",us,",
				types: ",origin,",
				nst: null,
				dmin: null,
				rms: 0.5,
				gap: null,
				magType: "mb",
				type: "earthquake",
				title: "M -5.0 - Low Mag Location",
			},
			geometry: {
				type: "Point",
				coordinates: [0, 0, 10],
			},
			id: "lowmag",
		};

		const result = normalizeEarthquakeEvent(lowMagFeature);
		expect(result.mag).toBe(-2.0);
	});

	it("should clamp magnitude > 10.0 to 10.0", () => {
		const highMagFeature: USGSFeature = {
			type: "Feature",
			properties: {
				mag: 15.0,
				place: "High Mag Location",
				time: 1729353600000,
				updated: 1729353700000,
				tz: null,
				url: "https://earthquake.usgs.gov/earthquakes/eventpage/highmag",
				detail:
					"https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=highmag",
				felt: null,
				cdi: null,
				mmi: null,
				alert: null,
				status: "reviewed",
				tsunami: 0,
				sig: 1000,
				net: "us",
				code: "highmag",
				ids: ",highmag,",
				sources: ",us,",
				types: ",origin,",
				nst: null,
				dmin: null,
				rms: 0.5,
				gap: null,
				magType: "mb",
				type: "earthquake",
				title: "M 15.0 - High Mag Location",
			},
			geometry: {
				type: "Point",
				coordinates: [0, 0, 10],
			},
			id: "highmag",
		};

		const result = normalizeEarthquakeEvent(highMagFeature);
		expect(result.mag).toBe(10.0);
	});
});
