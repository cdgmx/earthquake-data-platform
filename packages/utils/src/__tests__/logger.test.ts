import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	calculateFingerprint,
	log,
	type StructuredLogEvent,
} from "../logger.js";

type ConsoleLogSpy = MockInstance<
	(...args: [message?: unknown, ...optionalParams: unknown[]]) => void
>;

describe("logger", () => {
	let consoleLogSpy: ConsoleLogSpy;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it("should log structured event under 8KB without truncation", () => {
		const event: StructuredLogEvent = {
			level: "INFO",
			timestamp: Date.now(),
			requestId: "test-request-id",
			message: "Test message",
			route: "/ingest/recent",
		};

		log(event);

		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const loggedData = consoleLogSpy.mock.calls[0][0];
		expect(loggedData).toBe(JSON.stringify(event));
		expect(loggedData).not.toContain("_truncated");
	});

	it("should truncate logs exceeding 8KB and add _truncated marker", () => {
		const largeMessage = "x".repeat(10 * 1024);
		const event: StructuredLogEvent = {
			level: "INFO",
			timestamp: Date.now(),
			requestId: "test-request-id",
			message: largeMessage,
			route: "/ingest/recent",
		};

		log(event);

		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const loggedData = consoleLogSpy.mock.calls[0][0] as string;

		expect(loggedData.length).toBeLessThanOrEqual(8 * 1024);
		expect(loggedData).toContain("_truncated");
		expect(loggedData).toContain('"_truncated":true');
	});

	it("should cap log output exactly at 8KB", () => {
		const largeMessage = "x".repeat(20 * 1024);
		const event: StructuredLogEvent = {
			level: "INFO",
			timestamp: Date.now(),
			requestId: "test-request-id",
			message: largeMessage,
			route: "/ingest/recent",
		};

		log(event);

		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const loggedData = consoleLogSpy.mock.calls[0][0] as string;
		expect(loggedData.length).toBeLessThanOrEqual(8 * 1024);
		expect(loggedData.length).toBeGreaterThan(8 * 1024 - 200);
	});

	it("should calculate fingerprint with size and SHA-256 hash", () => {
		const data = '{"type":"FeatureCollection","features":[]}';
		const fingerprint = calculateFingerprint(data);

		expect(fingerprint.size).toBe(Buffer.byteLength(data, "utf8"));
		expect(fingerprint.hash).toMatch(/^[a-f0-9]{64}$/);
		expect(fingerprint.hash.length).toBe(64);
	});

	it("should produce consistent fingerprints for same data", () => {
		const data = '{"test":"value"}';
		const fp1 = calculateFingerprint(data);
		const fp2 = calculateFingerprint(data);

		expect(fp1.size).toBe(fp2.size);
		expect(fp1.hash).toBe(fp2.hash);
	});

	it("should produce different fingerprints for different data", () => {
		const data1 = '{"test":"value1"}';
		const data2 = '{"test":"value2"}';
		const fp1 = calculateFingerprint(data1);
		const fp2 = calculateFingerprint(data2);

		expect(fp1.hash).not.toBe(fp2.hash);
	});
});
