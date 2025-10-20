#!/usr/bin/env node
import "dotenv/config";
import * as cdk from "aws-cdk-lib";
import { ApiGatewayStack } from "../lib/stacks/api-gateway-stack.js";
import { EarthquakeDataStack } from "../lib/stacks/earthquake-data-stack.js";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
if (!account) {
	throw new Error("CDK_DEFAULT_ACCOUNT environment variable is required");
}

const region = process.env.CDK_DEFAULT_REGION;
if (!region) {
	throw new Error("CDK_DEFAULT_REGION environment variable is required");
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

new EarthquakeDataStack(app, "EarthquakeDataStack", {
	env: {
		account,
		region,
	},
});
