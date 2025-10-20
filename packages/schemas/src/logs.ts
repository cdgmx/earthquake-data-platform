import { z } from "zod";

export enum LogType {
	Query = "QUERY",
	Ingest = "INGEST",
}

const BaseRequestLogSchema = z.object({
	entity: z.literal("LOG"),
	requestId: z.string(),
	timestamp: z.number().int(),
	route: z.string(),
	status: z.number().int(),
	latencyMs: z.number().int().nonnegative(),
	ttl: z.number().int(),
	error: z.string().optional(),
});

const ItemSchema = z.object({
	pk: z.string(),
	sk: z.string(),
	gsi1pk: z.string(),
	gsi1sk: z.number().int(),
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

export const QueryRequestLogItemSchema = QueryRequestLogSchema.extend(
	ItemSchema.shape,
);

export const IngestRequestLogSchema = BaseRequestLogSchema.extend({
	logType: z.literal(LogType.Ingest),
	fetched: z.number().int().nonnegative(),
	upserted: z.number().int().nonnegative(),
	skipped: z.number().int().nonnegative(),
	retries: z.number().int().nonnegative(),
});

export const IngestRequestLogItemSchema = IngestRequestLogSchema.extend(
	ItemSchema.shape,
);

export type IngestRequestLog = z.infer<typeof IngestRequestLogSchema>;
export type QueryRequestLog = z.infer<typeof QueryRequestLogSchema>;
export type BaseRequestLog = z.infer<typeof BaseRequestLogSchema>;
