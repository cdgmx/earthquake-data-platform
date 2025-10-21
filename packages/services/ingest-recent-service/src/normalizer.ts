import {
	EarthquakeEventItemSchema,
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
	if (mag < -2.0) {
		return -2.0;
	}
	if (mag > 10.0) {
		return 10.0;
	}
	return mag;
}

export function normalizeEarthquakeEvent(feature: USGSFeature) {
	const validatedFeature = USGSFeatureSchema.parse(feature);

	const eventId = validatedFeature.id;
	const eventTsMs = validatedFeature.properties.time;
	const [lon, lat, depth] = validatedFeature.geometry.coordinates;

	validateCoordinates(lon, lat);

	const validatedMag = validateMagnitude(validatedFeature.properties.mag);

	const dayBucket = calculateDayBucket(eventTsMs);

	let place: string | null = null;
	if (
		validatedFeature.properties.place !== null &&
		validatedFeature.properties.place !== undefined
	) {
		place = validatedFeature.properties.place;
	}

	let depthValue: number | null = null;
	if (depth !== null && depth !== undefined) {
		depthValue = depth;
	}

	const event = {
		pk: `EVENT#${eventId}`,
		sk: "EVENT",
		entity: "EVENT",
		eventId,
		eventTsMs,
		mag: validatedMag,
		place,
		lat,
		lon,
		depth: depthValue,
		dayBucket,
		gsi1pk: `DAY#${dayBucket}`,
		gsi1sk: eventTsMs,
		source: "USGS",
		ingestedAt: Date.now(),
	};

	return EarthquakeEventItemSchema.parse(event);
}

export function calculateDayBucket(timestampMs: number): string {
	const date = new Date(timestampMs);
	return date.toISOString().slice(0, 10).replace(/-/g, "");
}
