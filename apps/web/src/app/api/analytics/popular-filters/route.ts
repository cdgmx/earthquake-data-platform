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

const BACKEND_URL =
	process.env.BACKEND_API_URL ||
	"http://localhost:4566/restapis/vkvolnfkbk/local/_user_request_";

type ResponseBody = AnalyticsResponse | ApiError;

export async function GET(
	request: NextRequest,
): Promise<NextResponse<ResponseBody>> {
	const searchParams = request.nextUrl.searchParams;

	const day = searchParams.get("day") || new Date().toISOString().slice(0, 10);
	const windowDays = Number.parseInt(searchParams.get("windowDays") || "7", 10);
	const limit = Number.parseInt(searchParams.get("limit") || "10", 10);

	try {
		const analyticsData = await fetchPopularFilters(
			BACKEND_URL,
			day,
			windowDays,
			limit,
		);

		return NextResponse.json(analyticsData, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=300",
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
