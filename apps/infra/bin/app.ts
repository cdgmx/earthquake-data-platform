#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
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

new EarthquakeDataStack(app, "EarthquakeDataStack", {
	env: {
		account,
		region,
	},
});
