import { z } from "zod";

const finiteNumber = z
	.number({
		message: "Value must be a number",
	})
	.finite();

export const EarthquakeFeaturePropertiesSchema = z
	.object({
		mag: finiteNumber.nullable().optional(),
		place: z.string().trim().optional().nullable(),
		time: finiteNumber.int().min(0),
		updated: finiteNumber.int().min(0).optional(),
		url: z.string().url(),
		felt: finiteNumber.int().nullable().optional(),
		tsunami: finiteNumber.int().nullable().optional(),
	})
	.catchall(z.any());

export const EarthquakeFeatureGeometrySchema = z.object({
	type: z.literal("Point"),
	coordinates: z
		.array(finiteNumber.nullable(), {
			message: "Coordinates must be numeric",
		})
		.min(2)
		.max(3),
});

export const EarthquakeFeatureSchema = z
	.object({
		type: z.literal("Feature"),
		id: z.string(),
		properties: EarthquakeFeaturePropertiesSchema,
		geometry: EarthquakeFeatureGeometrySchema,
		bbox: z.array(finiteNumber).length(6).optional(),
	})
	.catchall(z.any());

export const EarthquakeGeoJSONSchema = z
	.object({
		type: z.literal("FeatureCollection"),
		metadata: z
			.object({
				generated: finiteNumber.int().min(0),
				title: z.string(),
				count: finiteNumber.int().min(0),
			})
			.catchall(z.any()),
		features: z.array(EarthquakeFeatureSchema),
	})
	.catchall(z.any())
	.superRefine((value, ctx) => {
		if (value.metadata.count < value.features.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "metadata.count must be >= features length",
				path: ["metadata", "count"],
			});
		}
	});

export type EarthquakeFeatureProperties = z.infer<
	typeof EarthquakeFeaturePropertiesSchema
>;
export type EarthquakeFeatureGeometry = z.infer<
	typeof EarthquakeFeatureGeometrySchema
>;
export type EarthquakeFeature = z.infer<typeof EarthquakeFeatureSchema>;
export type EarthquakeGeoJSON = z.infer<typeof EarthquakeGeoJSONSchema>;

export const ApiEarthquakeCoordinatesSchema = z.object({
	latitude: finiteNumber.nullable(),
	longitude: finiteNumber.nullable(),
	depthKm: finiteNumber.nullable(),
});

export const ApiEarthquakeItemSchema = z.object({
	id: z.string(),
	magnitude: finiteNumber.nullable(),
	place: z.string(),
	occurredAt: z.string(),
	detailUrl: z.string().url(),
	coordinates: ApiEarthquakeCoordinatesSchema,
});

export const ApiEarthquakesOkSchema = z.object({
	status: z.literal("ok"),
	updatedAt: z.string(),
	items: z.array(ApiEarthquakeItemSchema).max(100),
});

export const ApiErrorSchema = z.object({
	status: z.literal("error"),
	code: z.enum([
		"INVALID_UPSTREAM_RESPONSE",
		"UPSTREAM_UNAVAILABLE",
		"INTERNAL_ERROR",
	]),
	message: z.string(),
	details: z.record(z.string(), z.any()).nullish(),
});
