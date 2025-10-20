import type { z } from "zod";

/**
 * Parses `process.env` against a Zod schema, providing a strictly typed,
 * frozen object. Throws a detailed error if validation fails.
 *
 * This function should be called ONCE at application startup.
 *
 * @param schema The Zod object schema to validate against.
 * @returns A read-only object with the validated environment variables.
 */
export function getRuntimeEnv<T extends z.ZodObject<z.ZodRawShape>>(
	schema: T,
): Readonly<z.infer<T>> {
	const parsed = schema.strict().safeParse(
		Object.fromEntries(
			Object.keys(schema.shape).map((key) => {
				const value = process.env[key];
				return [key, value === "" || value == null ? undefined : value];
			}),
		),
	);

	if (!parsed.success) {
		const message =
			"Environment validation failed:\n" +
			parsed.error.issues
				.map((i) => `  - ${i.path.join(".")}: ${i.message}`)
				.join("\n");
		throw new Error(message);
	}

	return Object.freeze(parsed.data) as Readonly<z.infer<T>>;
}
