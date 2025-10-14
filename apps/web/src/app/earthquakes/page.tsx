import {
	ApiClientError,
	fetchEarthquakesFromApi,
} from "@earthquake/earthquakes/earthquakes/api-client";
import { formatOccurredAt } from "@earthquake/earthquakes/earthquakes/format";
import type {
	ApiEarthquakesOk,
	ApiError,
} from "@earthquake/earthquakes/types/api";
import { normalizeErrorDetails } from "@earthquake/earthquakes/utils/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@earthquake/ui/card";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { EarthquakeStatus } from "@/components/earthquake-status";
import { EarthquakeTable } from "@/components/earthquake-table";

type ErrorWithStatus = ApiError & { statusCode: number };

const resolveOriginFromHeaders = (
	hdrs: Awaited<ReturnType<typeof headers>>,
) => {
	const forwarded = hdrs.get("x-forwarded-proto");
	let proto = "http";
	if (typeof forwarded === "string" && forwarded.length > 0) {
		const first = forwarded.split(",")[0];
		if (first.length > 0) proto = first;
	}

	let host = hdrs.get("host");
	if (host === null || host.length === 0) {
		host = "localhost:3000";
	}

	return `${proto}://${host}`;
};

const buildForwardHeadersFrom = (hdrs: Awaited<ReturnType<typeof headers>>) => {
	const out: Record<string, string> = {};
	const cookie = hdrs.get("cookie");
	if (typeof cookie === "string" && cookie.length > 0) out.cookie = cookie;

	const authorization = hdrs.get("authorization");
	if (typeof authorization === "string" && authorization.length > 0)
		out.authorization = authorization;

	const protectionBypass = hdrs.get("x-vercel-protection-bypass");
	if (typeof protectionBypass === "string" && protectionBypass.length > 0)
		out["x-vercel-protection-bypass"] = protectionBypass;

	return out;
};

export default async function EarthquakesPage() {
	let data: ApiEarthquakesOk | undefined;
	let error: ErrorWithStatus | undefined;

	try {
		const hdrs = await headers();
		const origin = resolveOriginFromHeaders(hdrs);
		const forwardHeaders = buildForwardHeadersFrom(hdrs);
		data = await fetchEarthquakesFromApi(origin, { headers: forwardHeaders });
	} catch (err) {
		if (err instanceof ApiClientError) {
			error = {
				statusCode: err.statusCode,
				...err.body,
			};
		} else {
			error = {
				statusCode: 500,
				status: "error",
				code: "INTERNAL_ERROR",
				message: "Unexpected error while loading earthquake data.",
				details: normalizeErrorDetails(err),
			};
		}
	}

	let items = [] as ApiEarthquakesOk["items"];
	if (data !== undefined) items = data.items;

	let cardContent: ReactNode = null;
	let headerMeta: ReactNode = null;

	if (error !== undefined) {
		cardContent = (
			<EarthquakeStatus status="error" error={error} retryHref="/earthquakes" />
		);
	} else if (data === undefined) {
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
		cardContent = <EarthquakeTable items={items} />;
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
						Data refreshed weekly from the USGS feed and validated through the
						internal API proxy.
					</p>
				</header>

				<Card>
					<CardHeader>
						<CardTitle className="flex flex-wrap items-baseline justify-between gap-3">
							<span>Weekly activity</span>
							{headerMeta}
						</CardTitle>
					</CardHeader>
					<CardContent>{cardContent}</CardContent>
				</Card>
			</div>
		</main>
	);
}
