import { z } from "zod";
import { AppError } from "../../../libs/errors/src/app-error.js";
import { ERROR_CODES } from "../../../libs/errors/src/error-codes.js";
import { decodeCursor, verifyCursorFilters } from "./cursor-codec.js";
import type { CursorPayload } from "./schemas.js";

const timestampSchema = z.union([
	z.string().datetime({ message: "Must be ISO-8601 format" }),
	z
		.string()
		.regex(/^\d+$/)
		.transform((val) => Number.parseInt(val, 10)),
	z.number().int().positive(),
]);

const magnitudeSchema = z
	.union([z.string().transform((val) => Number.parseFloat(val)), z.number()])
	.pipe(
		z
			.number()
			.min(-2.0, "minmagnitude must be >= -2.0")
			.max(10.0, "minmagnitude must be <= 10.0"),
	);

const pageSizeSchema = z
	.union([z.string().transform((val) => Number.parseInt(val, 10)), z.number()])
	.pipe(
		z
			.number()
			.int()
			.min(1, "pageSize must be >= 1")
			.max(100, "pageSize must be <= 100"),
	);

export const queryParamsSchema = z
	.object({
		starttime: timestampSchema,
		endtime: timestampSchema,
		minmagnitude: magnitudeSchema,
		pageSize: pageSizeSchema.optional().default(50),
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
	try {
		if (!params || typeof params !== "object") {
			throw new AppError({
				code: ERROR_CODES.VALIDATION_ERROR,
				message: "Missing query parameters",
				httpStatus: 400,
			});
		}

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
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new AppError({
				code: ERROR_CODES.VALIDATION_ERROR,
				message: error.issues.map((e) => e.message).join("; "),
				httpStatus: 400,
			});
		} else {
			throw new AppError({
				code: ERROR_CODES.VALIDATION_ERROR,
				message:
					error instanceof Error ? error.message : "Invalid query parameters",
				httpStatus: 400,
			});
		}
	}
}
