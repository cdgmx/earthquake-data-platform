"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimeSeriesDataPoint {
	date: string;
	count: number;
	avgMagnitude?: number;
}

interface MagnitudeDistributionPoint {
	range: string;
	count: number;
	color: string;
}

interface AreaChartProps {
	data: TimeSeriesDataPoint[];
	title: string;
	subtitle?: string;
	dataKey?: string;
	color?: string;
	delay?: number;
}

export function EarthquakeAreaChart({
	data,
	title,
	subtitle,
	dataKey = "count",
	color = "#f97316",
	delay = 0,
}: AreaChartProps) {
	const gradientId = useId();

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay }}
		>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center justify-between">
						<span>{title}</span>
						{subtitle && (
							<span className="text-sm font-normal text-[hsl(var(--color-muted-foreground))]">
								{subtitle}
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[200px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={data}>
								<defs>
									<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor={color} stopOpacity={0.3} />
										<stop offset="95%" stopColor={color} stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-[hsl(var(--color-border))]"
								/>
								<XAxis
									dataKey="date"
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
									className="text-[hsl(var(--color-muted-foreground))]"
								/>
								<YAxis
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
									className="text-[hsl(var(--color-muted-foreground))]"
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "hsl(var(--color-card))",
										border: "1px solid hsl(var(--color-border))",
										borderRadius: "8px",
									}}
								/>
								<Area
									type="monotone"
									dataKey={dataKey}
									stroke={color}
									strokeWidth={2}
									fill={`url(#${gradientId})`}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

interface MultiLineChartProps {
	data: TimeSeriesDataPoint[];
	title: string;
	lines: Array<{
		dataKey: string;
		color: string;
		name: string;
	}>;
	delay?: number;
}

export function EarthquakeMultiLineChart({
	data,
	title,
	lines,
	delay = 0,
}: MultiLineChartProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay }}
		>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[200px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={data}>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-[hsl(var(--color-border))]"
								/>
								<XAxis
									dataKey="date"
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "hsl(var(--color-card))",
										border: "1px solid hsl(var(--color-border))",
										borderRadius: "8px",
									}}
								/>
								<Legend />
								{lines.map((line) => (
									<Line
										key={line.dataKey}
										type="monotone"
										dataKey={line.dataKey}
										stroke={line.color}
										strokeWidth={2}
										dot={false}
										name={line.name}
									/>
								))}
							</LineChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

interface MagnitudeBarChartProps {
	data: MagnitudeDistributionPoint[];
	title: string;
	delay?: number;
}

export function MagnitudeBarChart({
	data,
	title,
	delay = 0,
}: MagnitudeBarChartProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay }}
		>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[200px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data} layout="vertical">
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-[hsl(var(--color-border))]"
								/>
								<XAxis
									type="number"
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									dataKey="range"
									type="category"
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
									width={80}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "hsl(var(--color-card))",
										border: "1px solid hsl(var(--color-border))",
										borderRadius: "8px",
									}}
								/>
								<Bar dataKey="count" radius={[0, 4, 4, 0]}>
									{data.map((entry) => (
										<Cell key={entry.range} fill={entry.color} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

interface DonutChartProps {
	data: Array<{ name: string; value: number; color: string }>;
	title: string;
	centerLabel?: string;
	centerValue?: string;
	delay?: number;
}

export function EarthquakeDonutChart({
	data,
	title,
	centerLabel,
	centerValue,
	delay = 0,
}: DonutChartProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay }}
		>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="relative h-[200px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={data}
									cx="50%"
									cy="50%"
									innerRadius={60}
									outerRadius={80}
									paddingAngle={2}
									dataKey="value"
								>
									{data.map((entry) => (
										<Cell key={entry.name} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									contentStyle={{
										backgroundColor: "hsl(var(--color-card))",
										border: "1px solid hsl(var(--color-border))",
										borderRadius: "8px",
									}}
								/>
								<Legend />
							</PieChart>
						</ResponsiveContainer>
						{centerLabel && centerValue && (
							<div className="absolute inset-0 flex flex-col items-center justify-center">
								<span className="text-2xl font-bold">{centerValue}</span>
								<span className="text-xs text-[hsl(var(--color-muted-foreground))]">
									{centerLabel}
								</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}
