"use client";

import type { ApiEarthquakeItem } from "@earthquake/schemas";
import type { ColumnDef } from "@tanstack/react-table";
import { parseISO } from "date-fns";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function formatOccurredAt(dateString: string): string {
	try {
		const date = parseISO(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMinutes < 1) return "Just now";
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return dateString;
	}
}

function formatMagnitude(mag: number | null): string {
	if (mag === null) return "—";
	return mag.toFixed(1);
}

export const columns: ColumnDef<ApiEarthquakeItem>[] = [
	{
		accessorKey: "occurredAt",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="-ml-4 h-8"
			>
				Time
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => {
			const dateValue = row.getValue("occurredAt") as string;
			return (
				<div className="min-w-[140px]">
					<span title={dateValue}>{formatOccurredAt(dateValue)}</span>
				</div>
			);
		},
		sortingFn: (rowA, rowB) => {
			const aDate = parseISO(rowA.getValue("occurredAt"));
			const bDate = parseISO(rowB.getValue("occurredAt"));
			return aDate.getTime() - bDate.getTime();
		},
	},
	{
		accessorKey: "magnitude",
		header: ({ column }) => (
			<div className="text-right">
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8"
				>
					Magnitude
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			</div>
		),
		cell: ({ row }) => {
			const mag = row.getValue("magnitude") as number | null;
			return (
				<div className="w-16 text-right font-mono">{formatMagnitude(mag)}</div>
			);
		},
		sortingFn: (rowA, rowB) => {
			const aMag = (rowA.getValue("magnitude") as number | null) ?? -1;
			const bMag = (rowB.getValue("magnitude") as number | null) ?? -1;
			return aMag - bMag;
		},
	},
	{
		accessorKey: "place",
		header: "Place",
		cell: ({ row }) => {
			const place = row.getValue("place") as string;
			return (
				<div className="max-w-xs truncate font-medium" title={place}>
					{place}
				</div>
			);
		},
	},
	{
		accessorKey: "coordinates.depthKm",
		header: ({ column }) => (
			<div className="text-right">
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8"
				>
					Depth (km)
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			</div>
		),
		cell: ({ row }) => {
			const depth = row.original.coordinates.depthKm;
			if (depth === null) {
				return <div className="w-20 text-right">—</div>;
			}
			return (
				<div className="w-20 text-right font-mono">{depth.toFixed(1)}</div>
			);
		},
		sortingFn: (rowA, rowB) => {
			const aDepth = rowA.original.coordinates.depthKm ?? -1;
			const bDepth = rowB.original.coordinates.depthKm ?? -1;
			return aDepth - bDepth;
		},
	},
	{
		accessorKey: "coordinates.latitude",
		header: "Latitude",
		cell: ({ row }) => {
			const lat = row.original.coordinates.latitude;
			if (lat === null) {
				return <div className="w-20 text-right">—</div>;
			}
			return (
				<div className="w-20 text-right font-mono text-xs">
					{lat.toFixed(2)}
				</div>
			);
		},
	},
	{
		accessorKey: "coordinates.longitude",
		header: "Longitude",
		cell: ({ row }) => {
			const lon = row.original.coordinates.longitude;
			if (lon === null) {
				return <div className="w-20 text-right">—</div>;
			}
			return (
				<div className="w-20 text-right font-mono text-xs">
					{lon.toFixed(2)}
				</div>
			);
		},
	},
	{
		id: "actions",
		header: "Details",
		cell: ({ row }) => {
			const earthquake = row.original;
			return (
				<Link
					href={earthquake.detailUrl}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Button variant="outline" size="sm">
						View
					</Button>
				</Link>
			);
		},
	},
];
