"use client";

import { Button } from "@earthquake/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import { parseISO } from "date-fns";
import Link from "next/link";
import type { ApiEarthquakeItem } from "../types/api";
import { formatMagnitude, formatOccurredAt } from "./format";

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
						<Button variant="outline" size="sm" asChild>
							<Link href={`/earthquakes/${row.original.id}`}>Details</Link>
						</Button>
						<Button variant="ghost" size="sm" asChild>
							<Link
								href={row.original.detailUrl}
								target="_blank"
								rel="noreferrer"
							>
								USGS ↗
							</Link>
						</Button>
					</div>
				);
			},
		},
	];
};
