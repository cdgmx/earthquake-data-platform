#!/usr/bin/env node
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { ApiGatewayStack } from "../lib/stacks/api-gateway-stack.js";
import { IngestStack } from "../lib/stacks/ingest-stack.js";

const app = new cdk.App();

let account = "000000000000";
const accountFromEnv = process.env.CDK_DEFAULT_ACCOUNT;
if (accountFromEnv !== undefined && accountFromEnv !== "") {
	account = accountFromEnv;
}

let region = "us-east-1";
const regionFromEnv = process.env.CDK_DEFAULT_REGION;
if (regionFromEnv !== undefined && regionFromEnv !== "") {
	region = regionFromEnv;
}

let enableUsagePlan = false;
const usagePlanFlag = process.env.ENABLE_USAGE_PLAN;
if (usagePlanFlag === "true") {
	enableUsagePlan = true;
}

new ApiGatewayStack(app, "ApiGatewayStack", {
	env: {
		account,
		region,
	},
	enableUsagePlan,
});

new IngestStack(app, "IngestStack", {
	env: {
		account,
		region,
	},
});
