import type { ApiEarthquakeItem, BackendEarthquakeEvent } from "../types/api";

export function transformBackendEvent(
	event: BackendEarthquakeEvent,
): ApiEarthquakeItem {
	return {
		id: event.eventId,
		magnitude: event.mag ?? 0,
		place: event.place || "Unknown location",
		occurredAt: new Date(event.eventTsMs).toISOString(),
		detailUrl: event.detailUrl || "",
		coordinates: {
			latitude: event.lat ?? 0,
			longitude: event.lon ?? 0,
			depthKm: event.depth ?? 0,
		},
	};
}

export function transformBackendEvents(
	events: BackendEarthquakeEvent[],
): ApiEarthquakeItem[] {
	return events.map(transformBackendEvent);
}
