/**
 * Shared test environment setup for Lambda services.
 * Sets baseline AWS SDK and DynamoDB configuration for all service tests.
 */

process.env.AWS_REGION = "us-east-1";
process.env.TABLE_NAME = "earthquake-events";
process.env.NEXT_TOKEN_SECRET = "test-secret-key-1234567890";
process.env.USGS_API_URL =
	"https://earthquake.usgs.gov/fdsnws/event/1/query";
