"use client";

import type { ApiEarthquakeItem } from "@earthquake/schemas";
import type { ColumnDef } from "@tanstack/react-table";
import { parseISO } from "date-fns";
import Link from "next/link";
import { cn } from "../utils";
import { formatMagnitude, formatOccurredAt } from "./format";

const actionButtonBase =
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
const actionButtonSmall = "h-8 rounded-md px-3 text-xs";
const outlineActionButton =
	"border border-[hsl(var(--color-input))] bg-[hsl(var(--color-background))] shadow-sm hover:bg-[hsl(var(--color-accent))] hover:text-[hsl(var(--color-accent-foreground))]";
const ghostActionButton =
	"hover:bg-[hsl(var(--color-accent))] hover:text-[hsl(var(--color-accent-foreground))]";

export const createEarthquakeColumns = (): ColumnDef<ApiEarthquakeItem>[] => {
	return [
		{
			accessorKey: "occurredAt",
			header: "Time",
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
			header: "Magnitude",
			cell: ({ row }) => {
				const mag = row.getValue("magnitude") as number | null;
				return (
					<div className="w-16 text-right font-mono">
						{formatMagnitude(mag)}
					</div>
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
			header: "Depth (km)",
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
			header: "More",
			cell: ({ row }) => {
				return (
					<div className="flex gap-2">
						<Link
							className={cn(
								actionButtonBase,
								actionButtonSmall,
								outlineActionButton,
							)}
							href={`/earthquakes/${row.original.id}`}
						>
							Details
						</Link>
						<Link
							className={cn(
								actionButtonBase,
								actionButtonSmall,
								ghostActionButton,
							)}
							href={row.original.detailUrl}
							target="_blank"
							rel="noreferrer"
						>
							USGS ↗
						</Link>
					</div>
				);
			},
		},
	];
};
