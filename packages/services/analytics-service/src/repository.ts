import type { DynamoDocClient } from "@earthquake/dynamo-client";
import { queryItems } from "@earthquake/dynamo-client";
import { LogType, type QueryRequestLog } from "@earthquake/schemas";

export interface QueryLogsParams {
	dayBucket: string;
}

export interface AnalyticsRepository {
	queryLogsByDay(params: QueryLogsParams): Promise<QueryRequestLog[]>;
}

interface CreateRepositoryParams {
	docClient: DynamoDocClient;
	tableName: string;
}

export function createRepository({
	docClient,
	tableName,
}: CreateRepositoryParams): AnalyticsRepository {
	async function queryLogsByDay(
		params: QueryLogsParams,
	): Promise<QueryRequestLog[]> {
		const { dayBucket } = params;
		const partitionKey = `LOG#${dayBucket}`;

		const allLogs: QueryRequestLog[] = [];
		let exclusiveStartKey: Record<string, unknown> | undefined;

		do {
			const result = await queryItems(docClient, {
				TableName: tableName,
				KeyConditionExpression: "pk = :pk",
				ExpressionAttributeValues: {
					":pk": partitionKey,
					":logType": LogType.Query,
				},
				FilterExpression: "logType = :logType",
				ExclusiveStartKey: exclusiveStartKey,
			});

			const queryLogs = result.items as QueryRequestLog[];
			allLogs.push(...queryLogs);

			exclusiveStartKey = result.lastEvaluatedKey;
		} while (exclusiveStartKey);

		return allLogs;
	}

	return {
		queryLogsByDay,
	};
}
