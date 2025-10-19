import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	PutCommand,
	type PutCommandInput,
} from "@aws-sdk/lib-dynamodb";

export type DynamoDocClient = ReturnType<typeof DynamoDBDocumentClient.from>;

export function createDocClient(options?: {
	client?: DynamoDBClient;
}): DynamoDocClient {
	const client =
		options?.client ??
		new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
	return DynamoDBDocumentClient.from(client);
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
