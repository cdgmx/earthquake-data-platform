import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EARTHQUAKE_MAX_ITEMS } from "@earthquake/earthquakes/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchEarthquakesApiResponse } from "../../src/app/api/earthquakes/route";

const fixturePath = join(__dirname, "__fixtures__", "usgs-all-week.json");

const loadFixture = () =>
	JSON.parse(readFileSync(fixturePath, "utf-8")) as Record<string, unknown>;

// Helper types/fixtures removed: tests use the App Router helper directly.

describe("/api/earthquakes", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("returns normalized earthquake items when upstream data is valid", async () => {
		const raw = loadFixture();

		const mockResponse = new Response(JSON.stringify(raw), {
			status: 200,
			headers: { "content-type": "application/json" },
		});

		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(mockResponse);

		const result = await fetchEarthquakesApiResponse();

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(result.statusCode).toBe(200);

		const payload = result.body as unknown as {
			status: string;
			items: Array<Record<string, unknown>>;
			updatedAt: string;
		};

		expect(payload?.status).toBe("ok");
		expect(Array.isArray(payload?.items)).toBe(true);
		expect(payload?.items?.length).toBeLessThanOrEqual(EARTHQUAKE_MAX_ITEMS);

		if (payload?.items && payload.items.length > 1) {
			const first = payload.items[0] as Record<string, unknown>;
			const second = payload.items[1] as Record<string, unknown>;
			const firstTime = new Date(first?.occurredAt as string).getTime();
			const secondTime = new Date(second?.occurredAt as string).getTime();
			expect(firstTime).toBeGreaterThan(secondTime);
		}
	});

	it("returns an error response when upstream payload is invalid", async () => {
		const invalidResponse = new Response("not-json", {
			status: 200,
			headers: { "content-type": "application/json" },
		});

		vi.spyOn(globalThis, "fetch").mockResolvedValue(invalidResponse);

		const result = await fetchEarthquakesApiResponse();

		expect(result.statusCode).toBe(502);

		const payload = result.body as unknown as {
			status: string;
			code: string;
			message: string;
		};

		expect(payload?.status).toBe("error");
		expect(payload?.code).toBe("INVALID_UPSTREAM_RESPONSE");
		expect(typeof payload?.message).toBe("string");
	});
});
