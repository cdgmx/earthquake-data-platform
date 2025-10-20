import { AppError, ERROR_CODES } from "@earthquake/errors";
import { type USGSResponse, USGSResponseSchema } from "./schemas.js";

const MAX_RETRIES = 3;
const BASE_DELAYS = [1000, 2000, 4000];

function addJitter(delayMs: number): number {
	const jitterRange = delayMs * 0.25;
	const jitter = Math.random() * jitterRange * 2 - jitterRange;
	return Math.floor(delayMs + jitter);
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRecentEarthquakes(usgsApiUrl: string): Promise<{
	data: USGSResponse;
	retries: number;
}> {
	let retries = 0;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await fetch(usgsApiUrl);

			if (!response.ok) {
				if (response.status >= 500 || response.status === 429) {
					if (attempt < MAX_RETRIES) {
						retries++;
						const delay = addJitter(BASE_DELAYS[attempt]);
						await sleep(delay);
						continue;
					}
					throw new AppError({
						code: ERROR_CODES.USGS_UNAVAILABLE,
						message: `USGS API returned ${response.status}: ${response.statusText}`,
						httpStatus: 503,
						metadata: {
							status: response.status,
							statusText: response.statusText,
						},
					});
				}
				throw new AppError({
					code: ERROR_CODES.USGS_UNAVAILABLE,
					message: `USGS API returned ${response.status}: ${response.statusText}`,
					httpStatus: 503,
					metadata: {
						status: response.status,
						statusText: response.statusText,
					},
				});
			}

			const rawData = await response.json();
			const data = USGSResponseSchema.parse(rawData);

			return {
				data,
				retries,
			};
		} catch (error) {
			if (error instanceof AppError) {
				if (attempt < MAX_RETRIES) {
					retries++;
					const delay = addJitter(BASE_DELAYS[attempt]);
					await sleep(delay);
					continue;
				}
				throw error;
			}

			const parseError = new AppError({
				code: ERROR_CODES.USGS_PARSE_ERROR,
				message: "Failed to parse USGS response",
				httpStatus: 502,
				cause: error,
			});

			if (attempt < MAX_RETRIES) {
				retries++;
				const delay = addJitter(BASE_DELAYS[attempt]);
				await sleep(delay);
				continue;
			}

			throw parseError;
		}
	}

	throw new AppError({
		code: ERROR_CODES.USGS_UNAVAILABLE,
		message: "Failed to fetch earthquakes after retries",
		httpStatus: 503,
	});
}
