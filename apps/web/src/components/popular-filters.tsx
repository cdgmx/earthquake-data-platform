"use client";

import type { PopularFilter } from "@earthquake/earthquakes/types/api";
import { Flame, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WINDOW_OPTIONS = [
	{ label: "Today", value: 1 },
	{ label: "2 Days", value: 2 },
	{ label: "3 Days", value: 3 },
	{ label: "7 Days", value: 7 },
] as const;

export function PopularFilters() {
	const router = useRouter();
	const [filters, setFilters] = useState<PopularFilter[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [windowDays, setWindowDays] = useState<number>(7);

	useEffect(() => {
		const fetchPopularFilters = async () => {
			try {
				setLoading(true);
				const today = new Date().toISOString().slice(0, 10);
				const params = new URLSearchParams({
					day: today,
					windowDays: String(windowDays),
					limit: "5",
				});
				const response = await fetch(
					`/api/analytics/popular-filters?${params}`,
				);

				if (!response.ok) {
					throw new Error("Failed to fetch popular filters");
				}

				const data = await response.json();
				if ("filters" in data && Array.isArray(data.filters)) {
					setFilters(data.filters);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		};

		fetchPopularFilters();
	}, [windowDays]);

	const handleFilterClick = (filter: PopularFilter) => {
		const params = new URLSearchParams();
		params.set("starttime", String(filter.starttime));
		params.set("endtime", String(filter.endtime));
		params.set("minmagnitude", String(filter.minmagnitude));
		params.set("pageSize", "50");

		router.push(`?${params.toString()}`);
	};

	const formatDateRange = (start: number, end: number) => {
		const startDate = new Date(start);
		const endDate = new Date(end);
		return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
	};

	const getTrendingLabel = (hits: number) => {
		if (hits >= 10) return "🔥 Hot";
		if (hits >= 5) return "📈 Rising";
		return "💡 Popular";
	};

	const getWindowLabel = () => {
		const option = WINDOW_OPTIONS.find((opt) => opt.value === windowDays);
		return option ? option.label : `${windowDays} Days`;
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2">
						<Flame className="h-5 w-5 text-orange-500" />
						Trending Searches
					</CardTitle>
					<div className="flex gap-1">
						{WINDOW_OPTIONS.map((option) => (
							<Button
								key={option.value}
								variant={windowDays === option.value ? "default" : "outline"}
								size="sm"
								onClick={() => setWindowDays(option.value)}
								className="text-xs"
							>
								{option.label}
							</Button>
						))}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--color-muted-foreground))]" />
					</div>
				) : error ? (
					<div className="py-4 text-center text-sm text-[hsl(var(--color-muted-foreground))]">
						Unable to load trending searches
					</div>
				) : filters.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-8">
						<Flame className="h-8 w-8 text-[hsl(var(--color-muted-foreground))]" />
						<p className="text-sm text-[hsl(var(--color-muted-foreground))]">
							No trending searches in the last {getWindowLabel().toLowerCase()}
						</p>
						<p className="text-xs text-[hsl(var(--color-muted-foreground))]">
							Popular filter combinations will appear here once users start
							searching
						</p>
					</div>
				) : (
					<div className="flex flex-wrap gap-2">
						{filters.map((filter, index) => {
							const key = `${filter.starttime}-${filter.endtime}-${filter.minmagnitude}`;
							const trendLabel = getTrendingLabel(filter.hits);
							const isTopTrending = index === 0;

							return (
								<Button
									key={key}
									variant="outline"
									size="sm"
									onClick={() => handleFilterClick(filter)}
									className="relative text-xs"
								>
									{isTopTrending && (
										<Flame className="absolute -left-1 -top-1 h-4 w-4 text-orange-500" />
									)}
									<div className="flex flex-col items-start gap-1">
										<div className="flex items-center gap-1.5">
											<span className="font-medium">
												Mag ≥ {filter.minmagnitude.toFixed(1)}
											</span>
											<span className="text-[10px] rounded bg-[hsl(var(--color-muted))] px-1.5 py-0.5">
												{trendLabel}
											</span>
										</div>
										<span className="text-[hsl(var(--color-muted-foreground))]">
											{formatDateRange(filter.starttime, filter.endtime)}
										</span>
										<div className="flex items-center gap-2 text-[hsl(var(--color-muted-foreground))]">
											<span>{filter.hits} searches</span>
											<span>•</span>
											<span>~{filter.avgResultCount} results</span>
										</div>
									</div>
								</Button>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
