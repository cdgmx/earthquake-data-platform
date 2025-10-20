import { z } from "zod";

export const EarthquakeItemSchema = z.object({
	eventId: z.string(),
	eventTsMs: z.number().int(),
	mag: z.number(),
	place: z.string(),
	lat: z.number().min(-90).max(90),
	lon: z.number().min(-180).max(180),
	depth: z.number().nullable(),
});

	// pk: z.string(),
	// sk: z.string(),
	// entity: z.string(),
	// eventId: z.string(),
	// eventTsMs: z.number().int(),
	// mag: z.number(),
	// place: z.string(),
	// lat: z.number().min(-90).max(90),
	// lon: z.number().min(-180).max(180),
	// depth: z.number().nullable(),
	// dayBucket: z.string(),
	// gsi1pk: z.string(),
	// gsi1sk: z.number().int(),
	// source: z.string(),
	// ingestedAt: z.number().int(),



export type EarthquakeItem = z.infer<typeof EarthquakeItemSchema>;
