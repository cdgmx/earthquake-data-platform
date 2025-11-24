import type {
	AnalyticsResponse,
	ApiEarthquakeItem,
	ApiEarthquakesOk,
	BackendQueryParams,
	PopularFilter,
} from "@earthquake/earthquakes/types/api";
import offlineEarthquakes from "@/data/offline-earthquakes.json";

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

const offlineStore = offlineEarthquakes as ApiEarthquakesOk;

const orderedOfflineItems: ApiEarthquakeItem[] = [...offlineStore.items].sort(
	(a, b) => {
		const aTime = Date.parse(a.occurredAt);
		const bTime = Date.parse(b.occurredAt);
		if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
			return 0;
		}
		return bTime - aTime;
	},
);

const parseTimestamp = (
	value: string | number | undefined | null,
): number | null => {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isNaN(parsed)) {
			return null;
		}
		return parsed;
	}

	return null;
};

const coerceMagnitude = (value: number | null | undefined): number => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	return 0;
};

const clampPageSize = (size: number | undefined): number => {
	if (typeof size !== "number" || Number.isNaN(size) || size <= 0) {
		return 50;
	}

	return Math.max(1, Math.min(500, Math.floor(size)));
};

const parseNextToken = (token: string | undefined): number => {
	if (!token) {
		return 0;
	}

	const parsed = Number.parseInt(token, 10);
	if (Number.isNaN(parsed) || parsed < 0) {
		return 0;
	}
	return parsed;
};

const filterByWindow = (
	items: ApiEarthquakeItem[],
	startTime: number,
	endTime: number,
	minMagnitude: number,
): ApiEarthquakeItem[] => {
	return items.filter((item) => {
		const occurred = Date.parse(item.occurredAt);
		if (Number.isNaN(occurred)) {
			return false;
		}

		if (occurred < startTime || occurred > endTime) {
			return false;
		}

		return coerceMagnitude(item.magnitude) >= minMagnitude;
	});
};

export const getOfflineEarthquakesStore = (): ApiEarthquakesOk => offlineStore;

export const queryOfflineEarthquakes = (
	params: BackendQueryParams,
): ApiEarthquakesOk & { nextToken?: string } => {
	let start = parseTimestamp(params.starttime);
	if (start === null) {
		start = Number.MIN_SAFE_INTEGER;
	}

	let end = parseTimestamp(params.endtime);
	if (end === null) {
		end = Number.MAX_SAFE_INTEGER;
	}

	let minMagnitude = 0;
	if (Number.isFinite(params.minmagnitude)) {
		minMagnitude = params.minmagnitude;
	}

	const pageSize = clampPageSize(params.pageSize);
	const offset = parseNextToken(params.nextToken);

	const normalizedStart = Math.min(start, end);
	const normalizedEnd = Math.max(start, end);

	const filteredItems = filterByWindow(
		orderedOfflineItems,
		normalizedStart,
		normalizedEnd,
		minMagnitude,
	);

	const slice = filteredItems.slice(offset, offset + pageSize);
	let nextToken: string | undefined;
	if (offset + pageSize < filteredItems.length) {
		nextToken = String(offset + pageSize);
	}

	return {
		status: "ok",
		updatedAt: offlineStore.updatedAt,
		items: slice,
		nextToken,
	};
};

const buildWindowBoundaries = (day: string, windowDays: number) => {
	let normalizedWindow = 7;
	if (Number.isFinite(windowDays) && windowDays > 0) {
		normalizedWindow = windowDays;
	}

	let baseDate: Date;
	if (day && day.trim().length > 0) {
		baseDate = new Date(`${day}T00:00:00Z`);
	} else {
		baseDate = new Date();
	}

	const timestamp = baseDate.getTime();
	let endTs = Date.now();
	if (!Number.isNaN(timestamp)) {
		endTs = baseDate.setUTCHours(23, 59, 59, 999);
	}
	const startTs = endTs - normalizedWindow * MILLISECONDS_IN_DAY;

	return { startTs, endTs, normalizedWindow };
};

const buildPopularFilter = (
	start: number,
	end: number,
	threshold: number,
	items: ApiEarthquakeItem[],
): PopularFilter | null => {
	const bucketItems = items.filter(
		(item) => coerceMagnitude(item.magnitude) >= threshold,
	);

	if (bucketItems.length === 0) {
		return null;
	}

	let avgDivisor = threshold;
	if (avgDivisor <= 0) {
		avgDivisor = 1;
	}

	return {
		starttime: start,
		endtime: end,
		minmagnitude: threshold,
		pageSize: 50,
		hits: Math.max(1, Math.round(bucketItems.length * 1.3)),
		hasNextTokenCount: Math.max(0, Math.floor(bucketItems.length / 50)),
		avgResultCount: Math.max(1, Math.round(bucketItems.length / avgDivisor)),
	};
};

export const buildOfflineAnalytics = (
	day: string,
	windowDays: number,
	limit: number,
): AnalyticsResponse => {
	const { startTs, endTs } = buildWindowBoundaries(day, windowDays);
	const windowedItems = orderedOfflineItems.filter((item) => {
		const occurred = Date.parse(item.occurredAt);
		return !Number.isNaN(occurred) && occurred >= startTs && occurred <= endTs;
	});

	const magnitudeThresholds = [0, 2.5, 4, 5.5, 6.5];
	const filters: PopularFilter[] = [];

	for (const threshold of magnitudeThresholds) {
		const filter = buildPopularFilter(startTs, endTs, threshold, windowedItems);
		if (filter) {
			filters.push(filter);
		}
	}

	let safeLimit = Math.floor(limit);
	if (!Number.isFinite(safeLimit) || safeLimit <= 0) {
		safeLimit = 5;
	}
	if (safeLimit > 10) {
		safeLimit = 10;
	}
	if (safeLimit < 1) {
		safeLimit = 1;
	}
	const limitedFilters = filters.slice(0, safeLimit);

	return {
		window: {
			startDay: new Date(startTs).toISOString().slice(0, 10),
			endDay: new Date(endTs).toISOString().slice(0, 10),
		},
		filters: limitedFilters,
		totalRequests: limitedFilters.reduce((sum, filter) => sum + filter.hits, 0),
	};
};
