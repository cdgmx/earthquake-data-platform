import type { ApiEarthquakeItem } from "@earthquake/schemas";
import { headers } from "next/headers";
import { DashboardContent, DashboardLayout } from "@/components/dashboard";
import { EarthquakeStatus } from "@/components/earthquake-status";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	const hdrs = await headers();

	const now = Date.now();
	const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

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
			starttime: String(sevenDaysAgo),
			endtime: String(now),
			minmagnitude: "0",
			pageSize: "100",
		});

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

	if (error) {
		return (
			<DashboardLayout>
				<div className="flex min-h-screen items-center justify-center p-8">
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
						retryHref="/dashboard"
					/>
				</div>
			</DashboardLayout>
		);
	}

	if (!data) {
		return (
			<DashboardLayout>
				<div className="flex min-h-screen items-center justify-center p-8">
					<EarthquakeStatus status="loading" rows={4} />
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<DashboardContent earthquakes={data.items} updatedAt={data.updatedAt} />
		</DashboardLayout>
	);
}
