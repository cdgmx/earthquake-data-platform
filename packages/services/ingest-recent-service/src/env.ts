import { getRuntimeEnv } from "@earthquake/env";
import { z } from "zod";

const EnvSchema = z.object({
	TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
	USGS_API_URL: z.url(),
});

export const env = getRuntimeEnv(EnvSchema);
