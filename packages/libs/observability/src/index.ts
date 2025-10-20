import { type DynamoDocClient, putItem } from "@earthquake/dynamo-client";
import {
	type BaseRequestLog,
	type IngestRequestLog,
	IngestRequestLogItemSchema,
	LogType,
	type QueryRequestLog,
	QueryRequestLogItemSchema,
} from "@earthquake/schemas";

type BaseLogInput = Omit<BaseRequestLog, "entity" | "ttl">;
export type IngestRequestLogInput = Omit<
	IngestRequestLog,
	"logType" | "entity" | "ttl"
>;
export type QueryRequestLogInput = Omit<
	QueryRequestLog,
	"logType" | "entity" | "ttl"
>;

function buildBaseLogStructure(input: BaseLogInput) {
	const { requestId, timestamp, route, status, latencyMs, error } = input;

	const dayBucket = new Date(timestamp)
		.toISOString()
		.slice(0, 10)
		.replace(/-/g, "");

	return {
		pk: `LOG#${dayBucket}`,
		sk: `${timestamp}#${requestId}`,
		gsi1pk: `LOG#${dayBucket}`,
		gsi1sk: timestamp,
		entity: "LOG" as const,
		requestId,
		timestamp,
		route,
		status,
		latencyMs,
		ttl: Math.floor(timestamp / 1000) + 7 * 24 * 60 * 60,
		...(error ? { error } : {}),
	};
}

export const buildIngestRequestLog = (
	params: IngestRequestLogInput,
): IngestRequestLog => {
	const baseLog = buildBaseLogStructure(params);

	return IngestRequestLogItemSchema.parse({
		...baseLog,
		logType: LogType.Ingest,
		fetched: params.fetched,
		upserted: params.upserted,
		skipped: params.skipped,
		retries: params.retries,
	});
};

export const buildQueryRequestLog = (
	params: QueryRequestLogInput,
): QueryRequestLog => {
	const baseLog = buildBaseLogStructure(params);

	return QueryRequestLogItemSchema.parse({
		...baseLog,
		logType: LogType.Query,
		starttime: params.starttime,
		endtime: params.endtime,
		minmagnitude: params.minmagnitude,
		pageSize: params.pageSize,
		resultCount: params.resultCount,
		hasNextToken: params.hasNextToken,
		bucketsScanned: params.bucketsScanned,
	});
};

export interface WriteRequestLogParams {
	tableName: string;
	item: IngestRequestLog | QueryRequestLog;
	client: DynamoDocClient;
}

export async function writeRequestLog(
	params: WriteRequestLogParams,
): Promise<void> {
	const { tableName, item, client } = params;
	await putItem(client, { TableName: tableName, Item: item });
}
