import { z } from "zod";

const ItemSchema = z.object({
	pk: z.string(),
	sk: z.string(),
	gsi1pk: z.string(),
	gsi1sk: z.number().int(),
});

export const EarthquakeEventSchema = z.object({
	eventId: z.string(),
	eventTsMs: z.number().int(),
	mag: z.number(),
	place: z.string().nullable(),
	lat: z.number().min(-90).max(90),
	lon: z.number().min(-180).max(180),
	depth: z.number().nullable(),
	entity: z.string(),
	dayBucket: z.string(),
	source: z.string(),
	ingestedAt: z.number().int(),
});

export const EarthquakeEventItemSchema = EarthquakeEventSchema.extend(
	ItemSchema.shape,
);

export type EarthquakeEvent = z.infer<typeof EarthquakeEventSchema>;
export type EarthquakeEventItem = z.infer<typeof EarthquakeEventItemSchema>;
