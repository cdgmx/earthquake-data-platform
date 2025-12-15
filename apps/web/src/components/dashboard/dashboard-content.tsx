"use client";

import type { ApiEarthquakeItem } from "@earthquake/schemas";
import { motion } from "framer-motion";
import {
	Activity,
	AlertTriangle,
	Globe,
	Mountain,
	Waves,
	Zap,
} from "lucide-react";
import {
	EarthquakeAreaChart,
	EarthquakeMap,
	MagnitudeBarChart,
	RecentActivity,
	StatCard,
	StatCardGrid,
	TopRegions,
} from "@/components/dashboard";
import {
	computeDashboardStats,
	computeMagnitudeDistribution,
	computeTimeSeriesData,
	formatMagnitude,
	formatNumber,
} from "@/components/dashboard/data-utils";

interface DashboardContentProps {
	earthquakes: ApiEarthquakeItem[];
	updatedAt?: string;
}

export function DashboardContent({
	earthquakes,
	updatedAt,
}: DashboardContentProps) {
	const stats = computeDashboardStats(earthquakes);
	const timeSeriesData = computeTimeSeriesData(earthquakes, 7);
	const magnitudeDistribution = computeMagnitudeDistribution(earthquakes);

	const chartData = timeSeriesData.map((d) => ({
		date: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
		count: d.count,
	}));

	const magnitudeChartData = magnitudeDistribution.map((d) => ({
		range: d.range,
		count: d.count,
		color: d.color,
	}));

	return (
		<div className="space-y-6 p-6 lg:p-8">
			<motion.header
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
			>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Earthquake Monitoring Dashboard
					</h1>
					<p className="text-sm text-[hsl(var(--color-muted-foreground))]">
						Real-time seismic activity overview
						{updatedAt && (
							<span>
								{" "}
								• Last updated {new Date(updatedAt).toLocaleTimeString()}
							</span>
						)}
					</p>
				</div>
			</motion.header>

			<StatCardGrid className="lg:grid-cols-6">
				<StatCard
					title="Total Events"
					value={formatNumber(stats.totalEvents)}
					icon={Activity}
					gradient="orange"
					trend={stats.eventsTrend}
					delay={0}
				/>
				<StatCard
					title="Today"
					value={formatNumber(stats.eventsToday)}
					icon={Zap}
					gradient="blue"
					delay={0.05}
				/>
				<StatCard
					title="Significant"
					value={formatNumber(stats.significantEvents)}
					icon={AlertTriangle}
					gradient="red"
					delay={0.1}
				/>
				<StatCard
					title="Max Magnitude"
					value={formatMagnitude(stats.maxMagnitude)}
					icon={Mountain}
					gradient="purple"
					delay={0.15}
				/>
				<StatCard
					title="Active Regions"
					value={formatNumber(stats.activeRegions)}
					icon={Globe}
					gradient="green"
					delay={0.2}
				/>
				<StatCard
					title="Deep Events"
					value={formatNumber(stats.deepEvents)}
					icon={Waves}
					gradient="blue"
					subtitle=">70km depth"
					delay={0.25}
				/>
			</StatCardGrid>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<EarthquakeMap earthquakes={earthquakes} height="400px" delay={0.3} />
				</div>
				<RecentActivity earthquakes={earthquakes} limit={5} delay={0.35} />
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<EarthquakeAreaChart
					data={chartData}
					title="Events This Week"
					subtitle="Daily earthquake count"
					color="#f97316"
					delay={0.4}
				/>
				<MagnitudeBarChart
					data={magnitudeChartData}
					title="Magnitude Distribution"
					delay={0.45}
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<TopRegions earthquakes={earthquakes} delay={0.5} />
				</div>
			</div>
		</div>
	);
}
