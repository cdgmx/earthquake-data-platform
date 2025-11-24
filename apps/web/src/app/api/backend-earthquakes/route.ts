import {
	BackendApiError,
	fetchEarthquakesFromBackend,
} from "@earthquake/earthquakes/earthquakes/backend-client";
import { transformBackendEvents } from "@earthquake/earthquakes/earthquakes/transform";
import type {
	ApiEarthquakesOk,
	ApiError,
	BackendQueryParams,
} from "@earthquake/earthquakes/types/api";
import { buildApiError } from "@earthquake/earthquakes/utils/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveBackendConfig } from "@/lib/backend-config";
import { queryOfflineEarthquakes } from "@/lib/offline-store";

type ResponseBody = ApiEarthquakesOk | ApiError;

export async function GET(
	request: NextRequest,
): Promise<NextResponse<ResponseBody>> {
	const searchParams = request.nextUrl.searchParams;

	const starttime = searchParams.get("starttime");
	const endtime = searchParams.get("endtime");
	const minmagnitude = searchParams.get("minmagnitude");
	const pageSize = searchParams.get("pageSize");
	const nextToken = searchParams.get("nextToken");

	if (!starttime || !endtime || !minmagnitude) {
		const { statusCode, body } = buildApiError("INTERNAL_ERROR", {
			details: {
				message:
					"Missing required query parameters: starttime, endtime, minmagnitude",
			},
		});
		return NextResponse.json(body, {
			status: statusCode,
			headers: { "Content-Type": "application/json" },
		});
	}

	let parsedPageSize: number | undefined;
	if (pageSize) {
		parsedPageSize = Number.parseInt(pageSize, 10);
	}

	let normalizedNextToken: string | undefined;
	if (nextToken && nextToken.length > 0) {
		normalizedNextToken = nextToken;
	}

	const params: BackendQueryParams = {
		starttime,
		endtime,
		minmagnitude: Number.parseFloat(minmagnitude),
		pageSize: parsedPageSize,
		nextToken: normalizedNextToken,
	};

	const resolvedBackend = resolveBackendConfig(
		request.cookies,
		process.env.BACKEND_API_URL,
	);

	if (!resolvedBackend.backendUrl) {
		const offlinePayload = queryOfflineEarthquakes(params);
		return NextResponse.json(offlinePayload, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
				"X-Backend-Mode": "offline",
			},
		});
	}

	try {
		const backendResponse = await fetchEarthquakesFromBackend(
			resolvedBackend.backendUrl,
			params,
		);

		const transformedItems = transformBackendEvents(backendResponse.items);

		const response: ApiEarthquakesOk & { nextToken?: string } = {
			status: "ok",
			updatedAt: new Date().toISOString(),
			items: transformedItems,
			nextToken: backendResponse.nextToken,
		};

		return NextResponse.json(response, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
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
