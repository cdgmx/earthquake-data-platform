import { AppError, ERROR_CODES } from "@earthquake/errors";
import { z } from "zod";

const daySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "day must be YYYY-MM-DD");

const windowDaysSchema = z
	.union([z.string().transform((val) => Number.parseInt(val, 10)), z.number()])
	.pipe(
		z
			.number()
			.int()
			.min(1, "windowDays must be at least 1")
			.max(7, "windowDays cannot exceed 7"),
	);

const limitSchema = z
	.union([z.string().transform((val) => Number.parseInt(val, 10)), z.number()])
	.pipe(
		z
			.number()
			.int()
			.min(1, "limit must be at least 1")
			.max(50, "limit cannot exceed 50"),
	);

export const queryParamsSchema = z.object({
	day: daySchema,
	windowDays: windowDaysSchema.optional().default(1),
	limit: limitSchema.optional().default(10),
});

export type ValidatedQueryParams = z.infer<typeof queryParamsSchema>;

export function validateQueryParams(params: unknown): ValidatedQueryParams {
	try {
		if (!params || typeof params !== "object") {
			throw new AppError({
				code: ERROR_CODES.VALIDATION_ERROR,
				message: "Missing query parameters",
				httpStatus: 400,
			});
		}

		const parsed = queryParamsSchema.parse(params);
		return parsed;
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new AppError({
				code: ERROR_CODES.VALIDATION_ERROR,
				message: error.issues.map((e) => e.message).join("; "),
				httpStatus: 400,
			});
		}
		if (error instanceof AppError) {
			throw error;
		}
		throw new AppError({
			code: ERROR_CODES.VALIDATION_ERROR,
			message:
				error instanceof Error ? error.message : "Invalid query parameters",
			httpStatus: 400,
		});
	}
}
