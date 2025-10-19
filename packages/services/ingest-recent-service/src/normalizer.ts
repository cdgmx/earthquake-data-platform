import {
	type EarthquakeEvent,
	EarthquakeEventSchema,
	type USGSFeature,
	USGSFeatureSchema,
} from "./schemas.js";

function validateCoordinates(lon: number, lat: number): void {
	if (lon < -180 || lon > 180) {
		throw new Error(`Invalid longitude: ${lon}`);
	}
	if (lat < -90 || lat > 90) {
		throw new Error(`Invalid latitude: ${lat}`);
	}
}

function validateMagnitude(mag: number): number {
	if (mag === null || mag === undefined || Number.isNaN(mag)) {
		throw new Error("Magnitude is required and must be a valid number");
	}
	if (mag < -2.0) return -2.0;
	if (mag > 10.0) return 10.0;
	return mag;
}

export function normalizeEarthquakeEvent(
	feature: USGSFeature,
): EarthquakeEvent {
	const validatedFeature = USGSFeatureSchema.parse(feature);

	const eventId = validatedFeature.id;
	const eventTsMs = validatedFeature.properties.time;
	const [lon, lat, depth] = validatedFeature.geometry.coordinates;

	validateCoordinates(lon, lat);
	const validatedMag = validateMagnitude(validatedFeature.properties.mag);

	const dayBucket = calculateDayBucket(eventTsMs);

	const event = {
		pk: `EVENT#${eventId}`,
		sk: "EVENT",
		entity: "EVENT",
		eventId,
		eventTsMs,
		mag: validatedMag,
		place: validatedFeature.properties.place,
		lat,
		lon,
		depth: depth ?? null,
		dayBucket,
		gsi1pk: `DAY#${dayBucket}`,
		gsi1sk: eventTsMs,
		source: "USGS",
		ingestedAt: Date.now(),
	};

	return EarthquakeEventSchema.parse(event);
}

export function calculateDayBucket(timestampMs: number): string {
	const date = new Date(timestampMs);
	return date.toISOString().slice(0, 10).replace(/-/g, "");
}
