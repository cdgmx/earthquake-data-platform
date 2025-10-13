"use client";

import { parseAsFloat, parseAsString, useQueryStates } from "nuqs";
import { useMemo } from "react";

export interface EarthquakeFilters {
	minMagnitude: number | null;
	maxMagnitude: number | null;
	minDepth: number | null;
	maxDepth: number | null;
	startDate: string | null;
	endDate: string | null;
	placeSearch: string;
}

const filterParsers = {
	minMag: parseAsFloat.withDefault(0),
	maxMag: parseAsFloat.withDefault(10),
	minDepth: parseAsFloat.withDefault(0),
	maxDepth: parseAsFloat.withDefault(700),
	startDate: parseAsString,
	endDate: parseAsString,
	place: parseAsString.withDefault(""),
};

export const useEarthquakeFilters = () => {
	const [state, setState] = useQueryStates(filterParsers, {
		history: "push",
		shallow: false,
	});

	const filters: EarthquakeFilters = useMemo(
		() => ({
			minMagnitude: state.minMag,
			maxMagnitude: state.maxMag,
			minDepth: state.minDepth,
			maxDepth: state.maxDepth,
			startDate: state.startDate,
			endDate: state.endDate,
			placeSearch: state.place,
		}),
		[
			state.minMag,
			state.maxMag,
			state.minDepth,
			state.maxDepth,
			state.startDate,
			state.endDate,
			state.place,
		],
	);

	const setFilters = (updates: Partial<EarthquakeFilters>) => {
		const urlUpdates: Partial<typeof state> = {};

		if (updates.minMagnitude !== undefined) {
			urlUpdates.minMag = updates.minMagnitude ?? undefined;
		}
		if (updates.maxMagnitude !== undefined) {
			urlUpdates.maxMag = updates.maxMagnitude ?? undefined;
		}
		if (updates.minDepth !== undefined) {
			urlUpdates.minDepth = updates.minDepth ?? undefined;
		}
		if (updates.maxDepth !== undefined) {
			urlUpdates.maxDepth = updates.maxDepth ?? undefined;
		}
		if (updates.startDate !== undefined) {
			urlUpdates.startDate = updates.startDate ?? undefined;
		}
		if (updates.endDate !== undefined) {
			urlUpdates.endDate = updates.endDate ?? undefined;
		}
		if (updates.placeSearch !== undefined) {
			urlUpdates.place = updates.placeSearch;
		}

		setState(urlUpdates);
	};

	const resetFilters = () => {
		setState({
			minMag: 0,
			maxMag: 10,
			minDepth: 0,
			maxDepth: 700,
			startDate: null,
			endDate: null,
			place: "",
		});
	};

	return { filters, setFilters, resetFilters };
};
