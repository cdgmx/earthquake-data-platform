import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../packages/services/ingest-recent-service/src/handler.js";

// Test 1: Simulate USGS unavailability by setting invalid URL
process.env.TABLE_NAME = "earthquake-events";
process.env.USGS_API_URL = "https://invalid-endpoint.example.com/query";

const event: APIGatewayProxyEvent = {
	resource: "/ingest/recent",
	path: "/ingest/recent",
	httpMethod: "POST",
	headers: {},
	multiValueHeaders: {},
	queryStringParameters: null,
	multiValueQueryStringParameters: null,
	pathParameters: null,
	stageVariables: null,
	requestContext: {
		accountId: "000000000000",
		apiId: "test",
		protocol: "HTTP/1.1",
		httpMethod: "POST",
		path: "/ingest/recent",
		stage: "local",
		requestId: "test-request-id",
		requestTimeEpoch: Date.now(),
		resourceId: "test",
		resourcePath: "/ingest/recent",
		identity: {
			accessKey: null,
			accountId: null,
			apiKey: null,
			apiKeyId: null,
			caller: null,
			clientCert: null,
			cognitoAuthenticationProvider: null,
			cognitoAuthenticationType: null,
			cognitoIdentityId: null,
			cognitoIdentityPoolId: null,
			principalOrgId: null,
			sourceIp: "127.0.0.1",
			user: null,
			userAgent: "test",
			userArn: null,
		},
		authorizer: null,
	},
	body: null,
	isBase64Encoded: false,
};

const mockContext = {
	callbackWaitsForEmptyEventLoop: true,
	functionName: "test-function",
	functionVersion: "$LATEST",
	invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test",
	memoryLimitInMB: "128",
	awsRequestId: "test-request-id",
	logGroupName: "/aws/lambda/test",
	logStreamName: "test-stream",
	getRemainingTimeInMillis: () => 30000,
	done: () => {},
	fail: () => {},
	succeed: () => {},
} as any;

console.log("Testing USGS_UNAVAILABLE error handling...");
const result = await handler(event, mockContext);
console.log("Status:", result.statusCode);
console.log("Body:", result.body);
