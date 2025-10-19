import { z } from "zod";

export const APIErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});

export type APIError = z.infer<typeof APIErrorSchema>;
