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

const BACKEND_URL =
	process.env.BACKEND_API_URL ||
	"http://localhost:4566/restapis/vkvolnfkbk/local/_user_request_";

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

	const params: BackendQueryParams = {
		starttime,
		endtime,
		minmagnitude: Number.parseFloat(minmagnitude),
		pageSize: pageSize ? Number.parseInt(pageSize, 10) : undefined,
		nextToken: nextToken || undefined,
	};

	try {
		const backendResponse = await fetchEarthquakesFromBackend(
			BACKEND_URL,
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
