import {
	formatMagnitude,
	formatOccurredAt,
} from "@earthquake/earthquakes/earthquakes/format";
import type { ApiEarthquakeItem } from "@earthquake/earthquakes/types/api";

import { TableCell, TableRow } from "@earthquake/ui/table";
import Link from "next/link";
import type { ReactNode } from "react";

type EarthquakeRowProps = {
	item: ApiEarthquakeItem;
};

const EarthquakeRow = ({ item }: EarthquakeRowProps) => {
	const { coordinates } = item;
	let coordinatesContent: ReactNode = null;
	const detailParts: string[] = [];
	if (coordinates.latitude !== null && coordinates.longitude !== null) {
		detailParts.push(`Lat ${coordinates.latitude.toFixed(2)}`);
		detailParts.push(`Lon ${coordinates.longitude.toFixed(2)}`);
	}
	if (coordinates.depthKm !== null) {
		detailParts.push(`${coordinates.depthKm.toFixed(1)} km depth`);
	}
	if (detailParts.length > 0) {
		coordinatesContent = (
			<div className="flex flex-wrap gap-x-3 text-xs text-[hsl(var(--color-muted-foreground))]">
				{detailParts.map((part) => (
					<span key={part}>{part}</span>
				))}
			</div>
		);
	}

	return (
		<TableRow>
			<TableCell className="font-mono text-base">
				{formatMagnitude(item.magnitude)}
			</TableCell>
			<TableCell>
				<div className="font-medium leading-snug">{item.place}</div>
				{coordinatesContent}
			</TableCell>
			<TableCell className="text-[hsl(var(--color-muted-foreground))]">
				{formatOccurredAt(item.occurredAt)}
			</TableCell>
			<TableCell>
				<Link
					className="text-[hsl(var(--color-primary))] underline underline-offset-4"
					href={item.detailUrl}
					target="_blank"
					rel="noreferrer"
				>
					View details
				</Link>
			</TableCell>
		</TableRow>
	);
};

export { EarthquakeRow };
