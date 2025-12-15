"use client";

import type { ApiEarthquakeItem } from "@earthquake/schemas";

interface TimeSeriesDataPoint {
	date: string;
	count: number;
	averageMagnitude: number;
}

interface MagnitudeDistribution {
	range: string;
	count: number;
	percentage: number;
	color: string;
}

interface RegionStats {
	region: string;
	count: number;
	averageMagnitude: number;
	maxMagnitude: number;
}

interface DashboardStats {
	totalEvents: number;
	significantEvents: number;
	averageMagnitude: number;
	maxMagnitude: number;
	minMagnitude: number;
	eventsToday: number;
	eventsTrend: number;
	activeRegions: number;
	deepEvents: number;
}

export function computeDashboardStats(
	earthquakes: ApiEarthquakeItem[],
): DashboardStats {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const magnitudes = earthquakes
		.map((q) => q.magnitude)
		.filter((m): m is number => m !== null);

	const todayEvents = earthquakes.filter(
		(q) => new Date(q.occurredAt) >= today,
	);
	const yesterdayEvents = earthquakes.filter((q) => {
		const date = new Date(q.occurredAt);
		return date >= yesterday && date < today;
	});

	const regions = new Set(
		earthquakes.map((q) => {
			const parts = (q.place ?? "Unknown").split(", ");
			return parts[parts.length - 1];
		}),
	);

	const deepEvents = earthquakes.filter((q) => (q.coordinates.depthKm ?? 0) > 70);

	const eventsTrend =
		yesterdayEvents.length > 0
			? ((todayEvents.length - yesterdayEvents.length) /
					yesterdayEvents.length) *
				100
			: todayEvents.length > 0
				? 100
				: 0;

	return {
		totalEvents: earthquakes.length,
		significantEvents: earthquakes.filter((q) => (q.magnitude ?? 0) >= 6).length,
		averageMagnitude:
			magnitudes.length > 0
				? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length
				: 0,
		maxMagnitude: magnitudes.length > 0 ? Math.max(...magnitudes) : 0,
		minMagnitude: magnitudes.length > 0 ? Math.min(...magnitudes) : 0,
		eventsToday: todayEvents.length,
		eventsTrend,
		activeRegions: regions.size,
		deepEvents: deepEvents.length,
	};
}

export function computeTimeSeriesData(
	earthquakes: ApiEarthquakeItem[],
	days = 7,
): TimeSeriesDataPoint[] {
	const now = new Date();
	const dateMap = new Map<string, { count: number; magnitudeSum: number }>();

	for (let i = 0; i < days; i++) {
		const date = new Date(now);
		date.setDate(date.getDate() - i);
		const dateKey = date.toISOString().split("T")[0];
		dateMap.set(dateKey, { count: 0, magnitudeSum: 0 });
	}

	for (const quake of earthquakes) {
		const dateKey = quake.occurredAt.split("T")[0];
		const existing = dateMap.get(dateKey);
		if (existing) {
			existing.count += 1;
			existing.magnitudeSum += quake.magnitude ?? 0;
		}
	}

	return Array.from(dateMap.entries())
		.map(([date, data]) => ({
			date,
			count: data.count,
			averageMagnitude: data.count > 0 ? data.magnitudeSum / data.count : 0,
		}))
		.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeMagnitudeDistribution(
	earthquakes: ApiEarthquakeItem[],
): MagnitudeDistribution[] {
	const ranges = [
		{ range: "0-2", min: 0, max: 2, color: "#93c5fd" },
		{ range: "2-3", min: 2, max: 3, color: "#86efac" },
		{ range: "3-4", min: 3, max: 4, color: "#fde047" },
		{ range: "4-5", min: 4, max: 5, color: "#fcd34d" },
		{ range: "5-6", min: 5, max: 6, color: "#fb923c" },
		{ range: "6+", min: 6, max: 10, color: "#ef4444" },
	];

	const total = earthquakes.length;

	return ranges.map(({ range, min, max, color }) => {
		const count = earthquakes.filter((q) => {
			const mag = q.magnitude ?? 0;
			return mag >= min && mag < max;
		}).length;

		return {
			range,
			count,
			percentage: total > 0 ? (count / total) * 100 : 0,
			color,
		};
	});
}

export function computeRegionStats(
	earthquakes: ApiEarthquakeItem[],
): RegionStats[] {
	const regionMap = new Map<
		string,
		{ count: number; magnitudeSum: number; maxMag: number }
	>();

	for (const quake of earthquakes) {
		const parts = (quake.place ?? "Unknown").split(", ");
		const region = parts[parts.length - 1] || "Unknown";

		const existing = regionMap.get(region) ?? {
			count: 0,
			magnitudeSum: 0,
			maxMag: 0,
		};

		existing.count += 1;
		existing.magnitudeSum += quake.magnitude ?? 0;
		if ((quake.magnitude ?? 0) > existing.maxMag) {
			existing.maxMag = quake.magnitude ?? 0;
		}

		regionMap.set(region, existing);
	}

	return Array.from(regionMap.entries())
		.map(([region, data]) => ({
			region,
			count: data.count,
			averageMagnitude: data.count > 0 ? data.magnitudeSum / data.count : 0,
			maxMagnitude: data.maxMag,
		}))
		.sort((a, b) => b.count - a.count);
}

export function computeDepthDistribution(
	earthquakes: ApiEarthquakeItem[],
): { depth: string; count: number; color: string }[] {
	const ranges = [
		{ depth: "0-10km", min: 0, max: 10, color: "#fef3c7" },
		{ depth: "10-30km", min: 10, max: 30, color: "#fed7aa" },
		{ depth: "30-70km", min: 30, max: 70, color: "#fdba74" },
		{ depth: "70-150km", min: 70, max: 150, color: "#fb923c" },
		{ depth: "150km+", min: 150, max: 1000, color: "#ea580c" },
	];

	return ranges.map(({ depth, min, max, color }) => {
		const count = earthquakes.filter((q) => {
			const d = q.coordinates.depthKm ?? 0;
			return d >= min && d < max;
		}).length;

		return { depth, count, color };
	});
}

export function formatNumber(num: number, decimals = 0): string {
	return num.toLocaleString(undefined, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

export function formatMagnitude(magnitude: number | null): string {
	if (magnitude === null) return "N/A";
	return magnitude.toFixed(1);
}
