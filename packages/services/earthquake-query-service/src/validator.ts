import { z } from "zod";
import { decodeCursor, verifyCursorFilters } from "./cursor-codec.js";
import type { CursorPayload } from "./schemas.js";

const timestampSchema = z.union([
	z.string().datetime({ message: "Must be ISO-8601 format" }),
	z.number().int().positive(),
]);

export const queryParamsSchema = z
	.object({
		starttime: timestampSchema,
		endtime: timestampSchema,
		minmagnitude: z
			.number()
			.min(-2.0, "minmagnitude must be >= -2.0")
			.max(10.0, "minmagnitude must be <= 10.0"),
		pageSize: z
			.number()
			.int()
			.min(1, "pageSize must be >= 1")
			.max(100, "pageSize must be <= 100")
			.optional()
			.default(50),
		nextToken: z.string().optional(),
	})
	.refine(
		(data) => {
			const start = parseTimestamp(data.starttime);
			const end = parseTimestamp(data.endtime);
			const futureLimit = Date.now() + 30 * 24 * 60 * 60 * 1000;
			return start <= futureLimit && end <= futureLimit;
		},
		{
			message: "Timestamp cannot be more than 30 days in future",
			path: ["endtime"],
		},
	)
	.refine(
		(data) => {
			const start = parseTimestamp(data.starttime);
			const end = parseTimestamp(data.endtime);
			return end >= start;
		},
		{
			message: "endtime must be >= starttime",
			path: ["endtime"],
		},
	)
	.refine(
		(data) => {
			const start = parseTimestamp(data.starttime);
			const end = parseTimestamp(data.endtime);
			const diff = end - start;
			const maxWindow = 365 * 24 * 60 * 60 * 1000;
			return diff <= maxWindow;
		},
		{
			message: "Query window cannot exceed 365 days",
			path: ["endtime"],
		},
	);

export type ValidatedQueryParams = z.infer<typeof queryParamsSchema> & {
	starttime: number;
	endtime: number;
	cursor?: CursorPayload;
};

export function parseTimestamp(value: string | number): number {
	if (typeof value === "number") {
		return value;
	}
	return new Date(value).getTime();
}

export function validateQueryParams(
	params: unknown,
	secret?: string,
): ValidatedQueryParams {
	const parsed = queryParamsSchema.parse(params);
	const starttime = parseTimestamp(parsed.starttime);
	const endtime = parseTimestamp(parsed.endtime);

	let cursor: CursorPayload | undefined;

	if (parsed.nextToken && secret) {
		try {
			cursor = decodeCursor(parsed.nextToken, secret);
			verifyCursorFilters(
				cursor,
				starttime,
				endtime,
				parsed.minmagnitude,
				parsed.pageSize,
			);
		} catch (error) {
			throw new Error(
				`Invalid nextToken: ${error instanceof Error ? error.message : "unknown error"}`,
			);
		}
	}

	return {
		...parsed,
		starttime,
		endtime,
		cursor,
	};
}
