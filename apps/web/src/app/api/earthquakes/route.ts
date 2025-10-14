import {
	EarthquakeFeedError,
	fetchNormalizedEarthquakes,
} from "@earthquake/earthquakes/earthquakes/fetch";
import type {
	ApiEarthquakesOk,
	ApiError,
} from "@earthquake/earthquakes/types/api";
import {
	buildApiError,
	normalizeErrorDetails,
} from "@earthquake/earthquakes/utils/errors";
import { NextResponse } from "next/server";

type ResponseBody = ApiEarthquakesOk | ApiError;

export async function fetchEarthquakesApiResponse(): Promise<{
	statusCode: number;
	body: ResponseBody;
	headers?: Record<string, string>;
}> {
	try {
		const payload = await fetchNormalizedEarthquakes();
		return {
			statusCode: 200,
			body: payload,
			headers: { "Cache-Control": "no-store" },
		};
	} catch (error) {
		if (error instanceof EarthquakeFeedError) {
			const { statusCode, body } = buildApiError(error.code, {
				details: error.details ?? normalizeErrorDetails(error.cause),
			});
			return { statusCode, body };
		}

		const { statusCode, body } = buildApiError("INTERNAL_ERROR", {
			details: normalizeErrorDetails(error),
		});
		return { statusCode, body };
	}
}

export async function GET(): Promise<NextResponse<ResponseBody>> {
	const { statusCode, body, headers } = await fetchEarthquakesApiResponse();
	return NextResponse.json(body, { status: statusCode, headers });
}
