import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log("Received event:", JSON.stringify(event, null, 2));

	try {
		const response = {
			message: "Hello from LocalStack!",
			timestamp: new Date().toISOString(),
			requestId: event.requestContext.requestId,
		};

		console.log("Sending response:", JSON.stringify(response, null, 2));

		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(response),
		};
	} catch (error) {
		console.error("Error processing request:", error);

		return {
			statusCode: 500,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				message: "Internal server error",
				error: error instanceof Error ? error.message : "Unknown error",
			}),
		};
	}
};
