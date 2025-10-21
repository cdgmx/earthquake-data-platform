import { formatOccurredAt } from "@earthquake/earthquakes/earthquakes/format";
import type { ApiEarthquakeItem } from "@earthquake/schemas";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { BackendFilterPanel } from "@/components/backend-filter-panel";
import { EarthquakeStatus } from "@/components/earthquake-status";
import { EarthquakeDataTable } from "@/components/earthquakes/earthquake-data-table";
import { PopularFilters } from "@/components/popular-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
	searchParams: Promise<{
		starttime?: string;
		endtime?: string;
		minmagnitude?: string;
		pageSize?: string;
		nextToken?: string;
	}>;
}

export default async function EarthquakesPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const hdrs = await headers();

	const now = Date.now();
	const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

	const starttime = params.starttime || String(sevenDaysAgo);
	const endtime = params.endtime || String(now);
	const minmagnitude = params.minmagnitude || "0";
	const pageSize = params.pageSize || "50";
	const nextToken = params.nextToken;

	let data:
		| {
				items: ApiEarthquakeItem[];
				nextToken?: string;
				updatedAt: string;
		  }
		| undefined;
	let error:
		| {
				statusCode: number;
				code: string;
				message: string;
		  }
		| undefined;

	try {
		const protocol = hdrs.get("x-forwarded-proto") || "http";
		const host = hdrs.get("host") || "localhost:3000";
		const origin = `${protocol}://${host}`;

		const queryParams = new URLSearchParams({
			starttime,
			endtime,
			minmagnitude,
			pageSize,
		});

		if (nextToken) {
			queryParams.set("nextToken", nextToken);
		}

		const url = `${origin}/api/backend-earthquakes?${queryParams.toString()}`;

		const response = await fetch(url, {
			cache: "no-store",
			headers: {
				cookie: hdrs.get("cookie") || "",
			},
		});

		const payload = await response.json();

		if (response.ok && payload.status === "ok") {
			data = payload;
		} else if (payload.code) {
			error = {
				statusCode: response.status,
				code: payload.code,
				message: payload.message,
			};
		} else {
			error = {
				statusCode: response.status,
				code: "UNKNOWN_ERROR",
				message: "An unexpected error occurred",
			};
		}
	} catch (err) {
		error = {
			statusCode: 500,
			code: "INTERNAL_ERROR",
			message: err instanceof Error ? err.message : "Internal server error",
		};
	}

	const items = data?.items || [];

	let cardContent: ReactNode = null;
	let headerMeta: ReactNode = null;

	if (error) {
		cardContent = (
			<EarthquakeStatus
				status="error"
				error={{
					statusCode: error.statusCode,
					status: "error",
					code: error.code as
						| "INVALID_UPSTREAM_RESPONSE"
						| "UPSTREAM_UNAVAILABLE"
						| "INTERNAL_ERROR"
						| "VALIDATION_ERROR"
						| "DATABASE_UNAVAILABLE"
						| "INFRASTRUCTURE_NOT_READY",
					message: error.message,
				}}
				retryHref="/earthquakes"
			/>
		);
	} else if (!data) {
		cardContent = <EarthquakeStatus status="loading" rows={4} />;
	} else if (items.length === 0) {
		cardContent = (
			<EarthquakeStatus
				status="empty"
				actionHref="/earthquakes"
				actionLabel="Refresh"
			/>
		);
	} else {
		cardContent = (
			<EarthquakeDataTable data={items} nextToken={data.nextToken} />
		);
		const formatted = formatOccurredAt(data.updatedAt);
		headerMeta = (
			<span className="text-sm font-normal text-[hsl(var(--color-muted-foreground))]">
				Updated {formatted}
			</span>
		);
	}

	return (
		<main className="min-h-screen bg-[hsl(var(--color-background))] py-12">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 md:px-10">
				<header className="space-y-2 text-center md:text-left">
					<h1 className="text-4xl font-semibold tracking-tight">
						Latest Earthquakes
					</h1>
					<p className="text-[hsl(var(--color-muted-foreground))]">
						Query earthquake data from our backend API with custom filters,
						sorting, and pagination.
					</p>
				</header>

				<PopularFilters />

				<BackendFilterPanel />

				<Card>
					<CardHeader>
						<CardTitle className="flex flex-wrap items-baseline justify-between gap-3">
							<span>Earthquake Results</span>
							{headerMeta}
						</CardTitle>
					</CardHeader>
					<CardContent>{cardContent}</CardContent>
				</Card>
			</div>
		</main>
	);
}
