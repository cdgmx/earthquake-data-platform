import { z } from "zod";

export const IngestSummarySchema = z.object({
	fetched: z.number().int().nonnegative(),
	upserted: z.number().int().nonnegative(),
	skipped: z.number().int().nonnegative(),
	retries: z.number().int().nonnegative(),
});

export type IngestSummary = z.infer<typeof IngestSummarySchema>;
export type { APIError as ErrorResponse } from "@earthquake/schemas/errors";

export const EarthquakeEventSchema = z.object({
	pk: z.string(),
	sk: z.string(),
	entity: z.string(),
	eventId: z.string(),
	eventTsMs: z.number().int(),
	mag: z.number(),
	place: z.string(),
	lat: z.number().min(-90).max(90),
	lon: z.number().min(-180).max(180),
	depth: z.number().nullable(),
	dayBucket: z.string(),
	gsi1pk: z.string(),
	gsi1sk: z.number().int(),
	source: z.string(),
	ingestedAt: z.number().int(),
});

export const RequestLogSchema = z.object({
	pk: z.string(),
	sk: z.string(),
	entity: z.string(),
	requestId: z.string(),
	timestamp: z.number().int(),
	route: z.string(),
	logType: z.string(),
	status: z.number().int(),
	latencyMs: z.number().int().nonnegative(),
	error: z.string().optional(),
	fetched: z.number().int().nonnegative().optional(),
	upserted: z.number().int().nonnegative().optional(),
	skipped: z.number().int().nonnegative().optional(),
	retries: z.number().int().nonnegative().optional(),
	params: z.record(z.string(), z.unknown()).optional(),
	upstreamSize: z.number().int().nonnegative().optional(),
	upstreamHash: z.string().optional(),
	ttl: z.number().int(),
});

export const USGSFeaturePropertiesSchema = z.object({
	mag: z.number(),
	place: z.string(),
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

export type EarthquakeEvent = z.infer<typeof EarthquakeEventSchema>;
export type RequestLog = z.infer<typeof RequestLogSchema>;
export type USGSFeature = z.infer<typeof USGSFeatureSchema>;
export type USGSResponse = z.infer<typeof USGSResponseSchema>;
