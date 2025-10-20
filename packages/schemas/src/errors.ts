import { z } from "zod";

export const APIErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
	details: z.unknown().optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;
