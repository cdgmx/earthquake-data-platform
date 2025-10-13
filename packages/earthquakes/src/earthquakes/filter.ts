import { parseISO } from "date-fns";

import type { ApiEarthquakeItem } from "../types/api";

import type { EarthquakeFilters } from "./use-earthquake-filters";

export const filterEarthquakes = (
	items: ApiEarthquakeItem[],
	filters: EarthquakeFilters,
): ApiEarthquakeItem[] => {
	return items.filter((item) => {
		if (filters.minMagnitude !== null && item.magnitude !== null) {
			if (item.magnitude < filters.minMagnitude) {
				return false;
			}
		}

		if (filters.maxMagnitude !== null && item.magnitude !== null) {
			if (item.magnitude > filters.maxMagnitude) {
				return false;
			}
		}

		if (filters.minDepth !== null && item.coordinates.depthKm !== null) {
			if (item.coordinates.depthKm < filters.minDepth) {
				return false;
			}
		}

		if (filters.maxDepth !== null && item.coordinates.depthKm !== null) {
			if (item.coordinates.depthKm > filters.maxDepth) {
				return false;
			}
		}

		if (filters.startDate !== null) {
			const itemDate = parseISO(item.occurredAt);
			const startDate = parseISO(filters.startDate);
			if (itemDate < startDate) {
				return false;
			}
		}

		if (filters.endDate !== null) {
			const itemDate = parseISO(item.occurredAt);
			const endDate = parseISO(filters.endDate);
			if (itemDate > endDate) {
				return false;
			}
		}

		if (filters.placeSearch.length > 0) {
			const searchLower = filters.placeSearch.toLowerCase();
			const placeLower = item.place.toLowerCase();
			if (!placeLower.includes(searchLower)) {
				return false;
			}
		}

		return true;
	});
};
