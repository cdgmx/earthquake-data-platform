import {
	BackendApiError,
	fetchPopularFilters,
} from "@earthquake/earthquakes/earthquakes/backend-client";
import type {
	AnalyticsResponse,
	ApiError,
} from "@earthquake/earthquakes/types/api";
import { buildApiError } from "@earthquake/earthquakes/utils/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveBackendConfig } from "@/lib/backend-config";
import { buildOfflineAnalytics } from "@/lib/offline-store";

type ResponseBody = AnalyticsResponse | ApiError;

export async function GET(
	request: NextRequest,
): Promise<NextResponse<ResponseBody>> {
	const searchParams = request.nextUrl.searchParams;

	let day = searchParams.get("day");
	if (!day) {
		day = new Date().toISOString().slice(0, 10);
	}

	let windowDays = 7;
	const rawWindow = searchParams.get("windowDays");
	if (rawWindow) {
		windowDays = Number.parseInt(rawWindow, 10);
	}

	let limit = 10;
	const rawLimit = searchParams.get("limit");
	if (rawLimit) {
		limit = Number.parseInt(rawLimit, 10);
	}

	const resolvedBackend = resolveBackendConfig(
		request.cookies,
		process.env.BACKEND_API_URL,
	);

	if (!resolvedBackend.backendUrl) {
		const offlineAnalytics = buildOfflineAnalytics(day, windowDays, limit);
		return NextResponse.json(offlineAnalytics, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=300",
				"X-Backend-Mode": "offline",
			},
		});
	}

	try {
		const analyticsData = await fetchPopularFilters(
			resolvedBackend.backendUrl,
			day,
			windowDays,
			limit,
		);

		return NextResponse.json(analyticsData, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=300",
				"X-Backend-Mode": resolvedBackend.mode,
			},
		});
	} catch (error) {
		if (error instanceof BackendApiError) {
			const { statusCode, body } = buildApiError("UPSTREAM_UNAVAILABLE", {
				details: error.body.details,
			});
			return NextResponse.json(body, {
				status: statusCode,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { statusCode, body } = buildApiError("INTERNAL_ERROR", {
			details: { message: error instanceof Error ? error.message : "Unknown" },
		});
		return NextResponse.json(body, {
			status: statusCode,
			headers: { "Content-Type": "application/json" },
		});
	}
}
