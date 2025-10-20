import { z } from "zod";

export enum LogType {
	Query = "QUERY",
	Ingest = "INGEST",
}

const BaseRequestLogSchema = z.object({
	pk: z.string(),
	sk: z.string(),
	gsi1pk: z.string(),
	gsi1sk: z.number().int(),
	entity: z.literal("LOG"),
	requestId: z.string(),
	timestamp: z.number().int(),
	route: z.string(),
	logType: z.nativeEnum(LogType),
	status: z.number().int(),
	latencyMs: z.number().int().nonnegative(),
	ttl: z.number().int(),
	error: z.string().optional(),
});

export const QueryRequestLogSchema = BaseRequestLogSchema.extend({
	logType: z.literal(LogType.Query),
	starttime: z.number().int(),
	endtime: z.number().int(),
	minmagnitude: z.number(),
	pageSize: z.number().int(),
	resultCount: z.number().int(),
	hasNextToken: z.boolean(),
	bucketsScanned: z.number().int().optional(),
});

export type QueryRequestLog = z.infer<typeof QueryRequestLogSchema>;

export const IngestRequestLogSchema = BaseRequestLogSchema.extend({
	logType: z.literal(LogType.Ingest),
	fetched: z.number().int().nonnegative(),
	upserted: z.number().int().nonnegative(),
	skipped: z.number().int().nonnegative(),
	retries: z.number().int().nonnegative(),
	params: z
		.record(z.string(), z.unknown())
		.optional()
		.default({}),
	upstreamSize: z.number().int().nonnegative().optional(),
	upstreamHash: z.string().optional(),
});

export type IngestRequestLog = z.infer<typeof IngestRequestLogSchema>;

export type RequestLog = QueryRequestLog | IngestRequestLog;
