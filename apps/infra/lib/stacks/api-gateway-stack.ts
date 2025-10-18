import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ApiGatewayStackProps extends cdk.StackProps {
	enableUsagePlan?: boolean;
}

export class ApiGatewayStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: ApiGatewayStackProps) {
		super(scope, id, props);

		const enableUsagePlan =
			props !== undefined && props.enableUsagePlan === true;

		const helloFunction = new NodejsFunction(this, "HelloService", {
			entry: path.join(
				__dirname,
				"../../../../packages/services/hello-service/src/handler.ts",
			),
			handler: "handler",
			runtime: lambda.Runtime.NODEJS_20_X,
			bundling: {
				minify: true,
				sourceMap: true,
				target: "es2022",
				externalModules: ["@aws-sdk/*"],
			},
		});

		const api = new apigateway.RestApi(this, "HelloApi", {
			restApiName: "Hello Service",
			deployOptions: {
				stageName: "dev",
			},
		});

		const integration = new apigateway.LambdaIntegration(helloFunction);

		if (enableUsagePlan) {
			api.root.addMethod("GET", integration, {
				apiKeyRequired: true,
			});
		} else {
			api.root.addMethod("GET", integration, {
				apiKeyRequired: false,
			});
		}

		const testResource = api.root.addResource("test");
		testResource.addMethod("GET", integration, {
			apiKeyRequired: false,
		});

		if (enableUsagePlan) {
			const apiKey = api.addApiKey("HelloApiKey", {
				value: "localstack-test-api-key-12345678",
			});

			const usagePlan = api.addUsagePlan("HelloUsagePlan", {
				name: "Hello Usage Plan",
				throttle: {
					rateLimit: 100,
					burstLimit: 200,
				},
			});

			usagePlan.addApiKey(apiKey);

			usagePlan.addApiStage({
				stage: api.deploymentStage,
			});

			new cdk.CfnOutput(this, "ApiKeyId", {
				value: apiKey.keyId,
				description: "API Key ID",
			});
		}

		new cdk.CfnOutput(this, "ApiUrl", {
			value: api.url,
			description: "API Gateway endpoint URL",
		});

		new cdk.CfnOutput(this, "LambdaFunctionName", {
			value: helloFunction.functionName,
			description: "Lambda function name",
		});

		new cdk.CfnOutput(this, "LambdaFunctionArn", {
			value: helloFunction.functionArn,
			description: "Lambda function ARN",
		});
	}
}
