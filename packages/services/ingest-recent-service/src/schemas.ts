import { z } from "zod";

export {
	type EarthquakeEventItem,
	EarthquakeEventItemSchema,
} from "@earthquake/schemas";
export type { APIError as ErrorResponse } from "@earthquake/schemas/errors";

export const USGSFeaturePropertiesSchema = z.object({
	mag: z.number(),
	place: z.string().nullable(),
	time: z.number().int(),
	updated: z.number().int(),
	tz: z.number().nullable(),
	url: z.string(),
	detail: z.string(),
	felt: z.number().nullable(),
	cdi: z.number().nullable(),
	mmi: z.number().nullable(),
	alert: z.string().nullable(),
	status: z.string(),
	tsunami: z.number().int(),
	sig: z.number().int(),
	net: z.string(),
	code: z.string(),
	ids: z.string(),
	sources: z.string(),
	types: z.string(),
	nst: z.number().nullable(),
	dmin: z.number().nullable(),
	rms: z.number(),
	gap: z.number().nullable(),
	magType: z.string(),
	type: z.string(),
	title: z.string(),
});

export const USGSFeatureGeometrySchema = z.object({
	type: z.string(),
	coordinates: z.tuple([z.number(), z.number(), z.number()]),
});

export const USGSFeatureSchema = z.object({
	type: z.string(),
	properties: USGSFeaturePropertiesSchema,
	geometry: USGSFeatureGeometrySchema,
	id: z.string(),
});

export const USGSResponseSchema = z.object({
	type: z.string(),
	metadata: z.object({
		generated: z.number().int(),
		url: z.string(),
		title: z.string(),
		status: z.number().int(),
		api: z.string(),
		count: z.number().int(),
	}),
	features: z.array(USGSFeatureSchema),
});

export type USGSFeature = z.infer<typeof USGSFeatureSchema>;
export type USGSResponse = z.infer<typeof USGSResponseSchema>;
