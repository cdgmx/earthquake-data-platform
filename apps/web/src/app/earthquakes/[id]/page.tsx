import {
	ApiClientError,
	fetchEarthquakesFromApi,
} from "@earthquake/earthquakes/earthquakes/api-client";
import {
	formatMagnitude,
	formatOccurredAt,
} from "@earthquake/earthquakes/earthquakes/format";
import type { ApiEarthquakesOk } from "@earthquake/earthquakes/types/api";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface PageProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function EarthquakeDetailPage({ params }: PageProps) {
	const { id } = await params;

	let data: ApiEarthquakesOk | undefined;
	try {
		const hdrs = await headers();
		const origin = resolveOriginFromHeaders(hdrs);
		const forwardHeaders = buildForwardHeadersFrom(hdrs);
		data = await fetchEarthquakesFromApi(origin, { headers: forwardHeaders });
	} catch (err) {
		if (err instanceof ApiClientError) {
			return (
				<main className="min-h-screen bg-[hsl(var(--color-background))] py-12">
					<div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 md:px-10">
						<Alert variant="destructive">
							<AlertTitle>Error Loading Data</AlertTitle>
							<AlertDescription>{err.message}</AlertDescription>
						</Alert>
						<Button asChild>
							<Link href="/earthquakes">← Back to List</Link>
						</Button>
					</div>
				</main>
			);
		}
		throw err;
	}

	const earthquake = data.items.find((item) => item.id === id);

	if (earthquake === undefined) {
		notFound();
	}

	const { coordinates } = earthquake;

	return (
		<main className="min-h-screen bg-[hsl(var(--color-background))] py-12">
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 md:px-10">
				<div className="flex items-center gap-4">
					<Button variant="outline" asChild>
						<Link href="/earthquakes">← Back to List</Link>
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">{earthquake.place}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<h3 className="text-sm font-medium text-[hsl(var(--color-muted-foreground))]">
									Magnitude
								</h3>
								<p className="mt-1 font-mono text-2xl">
									{formatMagnitude(earthquake.magnitude)}
								</p>
							</div>

							<div>
								<h3 className="text-sm font-medium text-[hsl(var(--color-muted-foreground))]">
									Occurred At
								</h3>
								<p className="mt-1 text-lg">
									{formatOccurredAt(earthquake.occurredAt)}
								</p>
							</div>

							{coordinates.latitude !== null &&
								coordinates.longitude !== null && (
									<>
										<div>
											<h3 className="text-sm font-medium text-[hsl(var(--color-muted-foreground))]">
												Latitude
											</h3>
											<p className="mt-1 font-mono">
												{coordinates.latitude.toFixed(4)}°
											</p>
										</div>

										<div>
											<h3 className="text-sm font-medium text-[hsl(var(--color-muted-foreground))]">
												Longitude
											</h3>
											<p className="mt-1 font-mono">
												{coordinates.longitude.toFixed(4)}°
											</p>
										</div>
									</>
								)}

							{coordinates.depthKm !== null && (
								<div>
									<h3 className="text-sm font-medium text-[hsl(var(--color-muted-foreground))]">
										Depth
									</h3>
									<p className="mt-1 font-mono">
										{coordinates.depthKm.toFixed(1)} km
									</p>
								</div>
							)}
						</div>

						<div className="flex flex-wrap gap-3 border-t pt-6">
							<Button asChild>
								<Link
									href={earthquake.detailUrl}
									target="_blank"
									rel="noreferrer"
								>
									View on USGS ↗
								</Link>
							</Button>

							{coordinates.latitude !== null &&
								coordinates.longitude !== null && (
									<Button variant="outline" asChild>
										<Link
											href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`}
											target="_blank"
											rel="noreferrer"
										>
											View on Google Maps ↗
										</Link>
									</Button>
								)}
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
