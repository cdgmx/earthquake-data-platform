import { getRuntimeEnv } from "@earthquake/env";
import { z } from "zod";

const EnvSchema = z.object({
	TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
	NEXT_TOKEN_SECRET: z
		.string()
		.min(16, "NEXT_TOKEN_SECRET must be at least 16 characters"),
});

export const env = getRuntimeEnv(EnvSchema);
