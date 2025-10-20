import {
	type DynamoDBDocumentClient,
	PutCommand,
	type PutCommandInput,
	QueryCommand,
	type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

export type DynamoDocClient = ReturnType<typeof DynamoDBDocumentClient.from>;

export interface QueryOptions {
	IndexName?: string;
	KeyConditionExpression: string;
	FilterExpression?: string;
	ExpressionAttributeValues: Record<string, unknown>;
	Limit?: number;
	ScanIndexForward?: boolean;
	ExclusiveStartKey?: Record<string, unknown>;
}

export interface QueryResult<T> {
	items: T[];
	lastEvaluatedKey?: Record<string, unknown>;
}

export async function putIfNotExists<T extends object>(
	docClient: DynamoDocClient,
	params: {
		TableName: string;
		Item: T;
		pkAttribute?: string;
	},
): Promise<"inserted" | "skipped"> {
	const pk = params.pkAttribute ?? "pk";
	try {
		const input: PutCommandInput = {
			TableName: params.TableName,
			Item: params.Item,
			ConditionExpression: `attribute_not_exists(${pk})`,
		};
		await docClient.send(new PutCommand(input));
		return "inserted";
	} catch (err: unknown) {
		if (
			err instanceof Error &&
			err.name === "ConditionalCheckFailedException"
		) {
			return "skipped";
		}
		throw err;
	}
}

export async function putItem<T extends object>(
	docClient: DynamoDocClient,
	params: { TableName: string; Item: T },
): Promise<void> {
	await docClient.send(
		new PutCommand({ TableName: params.TableName, Item: params.Item }),
	);
}

export async function queryItems<T>(
	docClient: DynamoDocClient,
	options: QueryCommandInput,
): Promise<QueryResult<T>> {
	const command = new QueryCommand(options);
	const { Items, LastEvaluatedKey } = await docClient.send(command);

	return {
		items: (Items as T[]) || [],
		lastEvaluatedKey: LastEvaluatedKey,
	};
}
