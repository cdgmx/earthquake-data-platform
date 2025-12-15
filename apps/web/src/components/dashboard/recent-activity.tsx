"use client";

import type { ApiEarthquakeItem } from "@earthquake/schemas";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, MapPin, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
	earthquakes: ApiEarthquakeItem[];
	title?: string;
	limit?: number;
	delay?: number;
}

function getMagnitudeClass(magnitude: number | null): string {
	if (magnitude === null) return "bg-gray-100 text-gray-600";
	if (magnitude >= 7) return "bg-red-100 text-red-700";
	if (magnitude >= 6) return "bg-orange-100 text-orange-700";
	if (magnitude >= 5) return "bg-amber-100 text-amber-700";
	if (magnitude >= 4) return "bg-yellow-100 text-yellow-700";
	if (magnitude >= 3) return "bg-green-100 text-green-700";
	return "bg-blue-100 text-blue-700";
}

function formatTimeAgo(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMinutes = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMinutes < 1) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

export function RecentActivity({
	earthquakes,
	title = "Recent Activity",
	limit = 6,
	delay = 0,
}: RecentActivityProps) {
	const recentQuakes = earthquakes.slice(0, limit);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay }}
		>
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center justify-between">
						<span>{title}</span>
						<Link
							href="/earthquakes"
							className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
						>
							View all
							<ArrowRight className="h-4 w-4" />
						</Link>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{recentQuakes.map((quake, index) => (
						<motion.div
							key={quake.id}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.3, delay: delay + index * 0.05 }}
							className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[hsl(var(--color-muted))]"
						>
							<div
								className={cn(
									"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold",
									getMagnitudeClass(quake.magnitude),
								)}
							>
								{quake.magnitude?.toFixed(1) ?? "?"}
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{quake.place}</p>
								<div className="flex items-center gap-2 text-xs text-[hsl(var(--color-muted-foreground))]">
									<MapPin className="h-3 w-3" />
									<span>
										{quake.coordinates.latitude?.toFixed(2)},{" "}
										{quake.coordinates.longitude?.toFixed(2)}
									</span>
									<span>•</span>
									<span>{formatTimeAgo(quake.occurredAt)}</span>
								</div>
							</div>
							<Link
								href={quake.detailUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="opacity-0 transition-opacity group-hover:opacity-100"
							>
								<ExternalLink className="h-4 w-4 text-[hsl(var(--color-muted-foreground))]" />
							</Link>
						</motion.div>
					))}
				</CardContent>
			</Card>
		</motion.div>
	);
}

interface TopRegionsProps {
	earthquakes: ApiEarthquakeItem[];
	title?: string;
	delay?: number;
}

export function TopRegions({
	earthquakes,
	title = "Top Regions",
	delay = 0,
}: TopRegionsProps) {
	const regionCounts = earthquakes.reduce<
		Record<string, { count: number; maxMag: number }>
	>((acc, quake) => {
		const place = quake.place ?? "Unknown";
		const parts = place.split(", ");
		const region = parts[parts.length - 1] || place;

		if (!acc[region]) {
			acc[region] = { count: 0, maxMag: 0 };
		}
		acc[region].count += 1;
		if (quake.magnitude !== null && quake.magnitude > acc[region].maxMag) {
			acc[region].maxMag = quake.magnitude;
		}
		return acc;
	}, {});

	const topRegions = Object.entries(regionCounts)
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, 5);

	const maxCount = topRegions[0]?.[1].count ?? 1;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay }}
		>
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-orange-500" />
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{topRegions.map(([region, data], index) => (
						<div key={region} className="space-y-1.5">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{region}</span>
								<span className="text-[hsl(var(--color-muted-foreground))]">
									{data.count} events
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--color-muted))]">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${(data.count / maxCount) * 100}%` }}
									transition={{ duration: 0.5, delay: delay + index * 0.1 }}
									className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
								/>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</motion.div>
	);
}
