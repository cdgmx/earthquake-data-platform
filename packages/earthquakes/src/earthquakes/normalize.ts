import { EARTHQUAKE_MAX_ITEMS } from "../config";
import type {
	EarthquakeFeature,
	EarthquakeGeoJSON,
} from "../schemas/earthquake";
import type { ApiEarthquakeItem, ApiEarthquakesOk } from "../types/api";

const UNKNOWN_PLACE = "Unknown location";

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

const coercePlace = (place: string | null | undefined): string => {
	if (typeof place !== "string") {
		return UNKNOWN_PLACE;
	}

	const trimmed = place.trim();
	return trimmed.length > 0 ? trimmed : UNKNOWN_PLACE;
};

const coerceMagnitude = (mag: number | null | undefined): number | null =>
	isFiniteNumber(mag) ? mag : null;

const coerceCoordinate = (coord: number | null | undefined): number | null =>
	isFiniteNumber(coord) ? coord : null;

const toIsoString = (epochMs: number): string => {
	const date = new Date(epochMs);
	return Number.isNaN(date.getTime())
		? new Date(0).toISOString()
		: date.toISOString();
};

export const normalizeFeature = (
	feature: EarthquakeFeature,
): ApiEarthquakeItem => {
	const [longitude, latitude, depth] = feature.geometry.coordinates;

	return {
		id: feature.id,
		magnitude: coerceMagnitude(feature.properties.mag),
		place: coercePlace(feature.properties.place),
		occurredAt: toIsoString(feature.properties.time),
		detailUrl: feature.properties.url,
		coordinates: {
			latitude: coerceCoordinate(latitude),
			longitude: coerceCoordinate(longitude),
			depthKm: coerceCoordinate(depth),
		},
	};
};

export const normalizeEarthquakes = (
	collection: EarthquakeGeoJSON,
): ApiEarthquakesOk => {
	const items = collection.features
		.slice()
		.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0))
		.slice(0, EARTHQUAKE_MAX_ITEMS)
		.map(normalizeFeature);

	return {
		status: "ok",
		updatedAt: toIsoString(collection.metadata.generated),
		items,
	};
};
