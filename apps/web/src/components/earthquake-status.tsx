import type { ApiError } from "@earthquake/earthquakes/types/api";
import { Alert, AlertDescription, AlertTitle } from "@earthquake/ui/alert";
import { Button } from "@earthquake/ui/button";
import { Skeleton } from "@earthquake/ui/skeleton";
import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import type { JSX } from "react";

type LoadingStatusProps = {
	status: "loading";
	rows?: number;
};

type EmptyStatusProps = {
	status: "empty";
	description?: string;
	actionHref?: string;
	actionLabel?: string;
};

type ErrorStatusProps = {
	status: "error";
	error: ApiError & { statusCode?: number };
	retryHref?: string;
};

type EarthquakeStatusProps =
	| LoadingStatusProps
	| EmptyStatusProps
	| ErrorStatusProps;

const defaultEmptyDescription =
	"No earthquakes available in the past week. The feed will refresh after the next USGS update.";

const defaultRetryLabel = "Try again";

const renderSkeletonRows = (rowCount: number) => {
	const rows: JSX.Element[] = [];
	let index = 0;
	while (index < rowCount) {
		rows.push(
			<li
				key={`skeleton-row-${index}`}
				className="grid grid-cols-[120px_1fr_160px_120px] gap-4 rounded-md border border-dashed border-[hsl(var(--color-border))] p-4"
			>
				<Skeleton className="h-5 w-16" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-3 w-1/3" />
				</div>
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-24" />
			</li>,
		);
		index += 1;
	}

	return (
		<ul className="space-y-3" aria-live="polite">
			{rows}
		</ul>
	);
};

const EarthquakeStatus = (props: EarthquakeStatusProps) => {
	if (props.status === "loading") {
		let rowCount = props.rows;
		if (
			typeof rowCount !== "number" ||
			Number.isNaN(rowCount) ||
			rowCount < 1
		) {
			rowCount = 4;
		}

		return (
			<div className="space-y-4">
				<Alert>
					<AlertTitle>Loading earthquakes</AlertTitle>
					<AlertDescription>
						Fetching the latest weekly data from the USGS feed.
					</AlertDescription>
				</Alert>
				{renderSkeletonRows(rowCount)}
			</div>
		);
	}

	if (props.status === "empty") {
		let description = defaultEmptyDescription;
		if (typeof props.description === "string") {
			const trimmed = props.description.trim();
			if (trimmed.length > 0) {
				description = trimmed;
			}
		}
		let actionHref = props.actionHref;
		if (actionHref === undefined || actionHref.trim().length === 0) {
			actionHref = "/earthquakes";
		}
		let actionLabel = props.actionLabel;
		if (actionLabel === undefined || actionLabel.trim().length === 0) {
			actionLabel = "Refresh";
		}

		return (
			<Alert>
				<AlertTitle>No recent earthquakes found</AlertTitle>
				<AlertDescription className="space-y-3">
					<p>{description}</p>
					<Button asChild>
						<Link href={actionHref}>{actionLabel}</Link>
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	const { error } = props;
	let retryHref = props.retryHref;
	if (retryHref === undefined || retryHref.trim().length === 0) {
		retryHref = "/earthquakes";
	}

	let statusCode: number | null = null;
	if (typeof error.statusCode === "number") {
		statusCode = error.statusCode;
	}
	let details: ApiError["details"] = null;
	if (error.details !== undefined && error.details !== null) {
		details = error.details;
	}
	const detailPayload = {
		code: error.code,
		statusCode,
		details,
	};

	return (
		<Alert variant="destructive">
			<AlertTitle>Unable to load earthquakes</AlertTitle>
			<AlertDescription className="space-y-3">
				<p>{error.message}</p>
				<Button asChild variant="outline">
					<Link href={retryHref}>{defaultRetryLabel}</Link>
				</Button>
				<pre className="overflow-auto rounded-md bg-[hsl(var(--color-destructive)/0.15)] p-3 text-xs text-[hsl(var(--color-destructive-foreground))]">
					{JSON.stringify(detailPayload, null, 2)}
				</pre>
			</AlertDescription>
		</Alert>
	);
};

export { EarthquakeStatus };
