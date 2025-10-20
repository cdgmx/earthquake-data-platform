import { describe, expect, it } from "vitest";
import {
	decodeCursor,
	encodeCursor,
	verifyCursorFilters,
} from "../cursor-codec.js";
import type { CursorPayload } from "../schemas.js";

describe("cursor-codec", () => {
	const SECRET = "test-secret-key-for-hmac-signing";

	describe("encodeCursor", () => {
		it("should encode cursor payload with HMAC signature", () => {
			const payload: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016", "20251017", "20251018"],
				idx: 0,
			};

			const encoded = encodeCursor(payload, SECRET);

			expect(encoded).toBeTruthy();
			expect(typeof encoded).toBe("string");
			expect(encoded).toContain(".");
		});

		it("should encode cursor with LastEvaluatedKey", () => {
			const payload: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016", "20251017", "20251018"],
				idx: 1,
				lek: {
					pk: "EVENT#us6000abc",
					sk: "METADATA",
					gsi1pk: "DAY#20251016",
					gsi1sk: 1729036800000,
				},
			};

			const encoded = encodeCursor(payload, SECRET);

			expect(encoded).toBeTruthy();
			expect(encoded).toContain(".");
		});

		it("should produce different signatures for different payloads", () => {
			const payload1: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			const payload2: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 3.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			const encoded1 = encodeCursor(payload1, SECRET);
			const encoded2 = encodeCursor(payload2, SECRET);

			expect(encoded1).not.toBe(encoded2);
		});

		it("should produce base64url-safe strings (no +, /, =)", () => {
			const payload: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			const encoded = encodeCursor(payload, SECRET);

			expect(encoded).not.toMatch(/[+/=]/);
		});
	});

	describe("decodeCursor", () => {
		it("should decode valid cursor and return payload", () => {
			const original: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			const encoded = encodeCursor(original, SECRET);
			const decoded = decodeCursor(encoded, SECRET);

			expect(decoded).toEqual(original);
		});

		it("should decode cursor with LastEvaluatedKey", () => {
			const original: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016", "20251017"],
				idx: 1,
				lek: {
					pk: "EVENT#us6000abc",
					sk: "METADATA",
					gsi1pk: "DAY#20251016",
					gsi1sk: 1729036800000,
				},
			};

			const encoded = encodeCursor(original, SECRET);
			const decoded = decodeCursor(encoded, SECRET);

			expect(decoded).toEqual(original);
		});

		it("should throw error if cursor has no dot separator", () => {
			expect(() => decodeCursor("invalidcursor", SECRET)).toThrow(
				"Invalid nextToken format",
			);
		});

		it("should throw error if HMAC signature is invalid", () => {
			const payload: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			const encoded = encodeCursor(payload, SECRET);
			const [payloadPart] = encoded.split(".");
			const tamperedCursor = `${payloadPart}.invalidsignature`;

			expect(() => decodeCursor(tamperedCursor, SECRET)).toThrow(
				"Invalid nextToken signature",
			);
		});

		it("should throw error if payload is tampered", () => {
			const payload: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			const encoded = encodeCursor(payload, SECRET);
			const [_payloadPart, signature] = encoded.split(".");

			const tamperedPayload = Buffer.from(
				JSON.stringify({ ...payload, mm: 5.0 }),
			)
				.toString("base64url")
				.replace(/=/g, "");
			const tamperedCursor = `${tamperedPayload}.${signature}`;

			expect(() => decodeCursor(tamperedCursor, SECRET)).toThrow(
				"Invalid nextToken signature",
			);
		});

		it("should throw error if payload is not valid JSON", () => {
			const invalidPayload = Buffer.from("not-json").toString("base64url");
			const signature = "dummysignature";
			const cursor = `${invalidPayload}.${signature}`;

			expect(() => decodeCursor(cursor, SECRET)).toThrow();
		});
	});

	describe("verifyCursorFilters", () => {
		it("should not throw when all filters match", () => {
			const cursor: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			expect(() =>
				verifyCursorFilters(cursor, 1729036800000, 1729296000000, 2.0, 50),
			).not.toThrow();
		});

		it("should throw when starttime differs", () => {
			const cursor: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			expect(() =>
				verifyCursorFilters(cursor, 1729123200000, 1729296000000, 2.0, 50),
			).toThrow("nextToken does not match query parameters");
		});

		it("should throw when endtime differs", () => {
			const cursor: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			expect(() =>
				verifyCursorFilters(cursor, 1729036800000, 1729382400000, 2.0, 50),
			).toThrow("nextToken does not match query parameters");
		});

		it("should throw when minmagnitude differs", () => {
			const cursor: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			expect(() =>
				verifyCursorFilters(cursor, 1729036800000, 1729296000000, 3.0, 50),
			).toThrow("nextToken does not match query parameters");
		});

		it("should throw when pageSize differs", () => {
			const cursor: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016"],
				idx: 0,
			};

			expect(() =>
				verifyCursorFilters(cursor, 1729036800000, 1729296000000, 2.0, 100),
			).toThrow("nextToken does not match query parameters");
		});
	});

	describe("round-trip encoding/decoding", () => {
		it("should preserve all payload fields through encode/decode cycle", () => {
			const payload: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.5,
				ps: 75,
				buckets: ["20251016", "20251017", "20251018", "20251019"],
				idx: 3,
				lek: {
					pk: "EVENT#us6000xyz",
					sk: "METADATA",
					gsi1pk: "DAY#20251018",
					gsi1sk: 1729209600000,
				},
			};

			const encoded = encodeCursor(payload, SECRET);
			const decoded = decodeCursor(encoded, SECRET);

			expect(decoded).toEqual(payload);
			expect(decoded.v).toBe(1);
			expect(decoded.st).toBe(1729036800000);
			expect(decoded.et).toBe(1729296000000);
			expect(decoded.mm).toBe(2.5);
			expect(decoded.ps).toBe(75);
			expect(decoded.idx).toBe(3);
			expect(decoded.lek).toEqual({
				pk: "EVENT#us6000xyz",
				sk: "METADATA",
				gsi1pk: "DAY#20251018",
				gsi1sk: 1729209600000,
			});
		});
	});
});
