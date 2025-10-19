import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IngestStack extends cdk.Stack {
	public readonly table: dynamodb.Table;
	public readonly ingestFunction: NodejsFunction;
	public readonly api: apigateway.RestApi;

	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		this.table = new dynamodb.Table(this, "EarthquakeEventsTable", {
			tableName: "earthquake-events",
			partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
			sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			timeToLiveAttribute: "ttl",
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		this.table.addGlobalSecondaryIndex({
			indexName: "TimeOrderedIndex",
			partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
			sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.NUMBER },
			projectionType: dynamodb.ProjectionType.ALL,
		});

		this.ingestFunction = new NodejsFunction(this, "IngestRecentFunction", {
			entry: path.join(
				__dirname,
				"../../../../packages/services/ingest-recent-service/src/index.ts",
			),
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			timeout: cdk.Duration.seconds(30),
			environment: {
				TABLE_NAME: this.table.tableName,
				AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
			},
			bundling: {
				minify: true,
				sourceMap: true,
				target: "es2020",
				externalModules: ["@aws-sdk/*"],
			},
		});

		this.table.grantReadWriteData(this.ingestFunction);

		this.api = new apigateway.RestApi(this, "IngestApi", {
			restApiName: "USGS Earthquake Ingestion Service",
			deployOptions: {
				stageName: "local",
			},
		});

		const integration = new apigateway.LambdaIntegration(this.ingestFunction);

		const ingest = this.api.root.addResource("ingest");
		const recent = ingest.addResource("recent");
		recent.addMethod("POST", integration);

		new cdk.CfnOutput(this, "ApiEndpoint", {
			value: this.api.url,
			description: "API Gateway endpoint URL",
		});

		new cdk.CfnOutput(this, "TableName", {
			value: this.table.tableName,
			description: "DynamoDB table name",
		});
	}
}
