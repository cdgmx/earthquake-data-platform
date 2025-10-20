import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateFingerprint, createLogger } from "../logger.js";

type ConsoleLogSpy = MockInstance<
	(...args: [message?: unknown, ...optionalParams: unknown[]]) => void
>;

describe("calculateFingerprint", () => {
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

describe("createLogger", () => {
	let consoleLogSpy: ConsoleLogSpy;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it("should inject service and environment into logs", () => {
		const logger = createLogger({
			service: "test-service",
		});

		logger.info("Test message");

		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
		expect(loggedData.service).toBe("test-service");
		expect(loggedData.environment).toBeDefined();
		expect(loggedData.message).toBe("Test message");
		expect(loggedData.level).toBe("INFO");
	});

	it("should inject default fields into all logs", () => {
		const logger = createLogger({
			service: "test-service",
			defaultFields: {
				version: "1.0.0",
				region: "us-east-1",
			},
		});

		logger.info("Test message");

		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
		expect(loggedData.version).toBe("1.0.0");
		expect(loggedData.region).toBe("us-east-1");
	});

	it("should redact sensitive keys", () => {
		const logger = createLogger({
			service: "test-service",
			redactKeys: ["password", "apiKey"],
		});

		logger.info("Auth attempt", {
			username: "test-user",
			password: "secret123",
			apiKey: "key-12345",
		});

		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
		expect(loggedData.username).toBe("test-user");
		expect(loggedData.password).toBe("[REDACTED]");
		expect(loggedData.apiKey).toBe("[REDACTED]");
	});

	it("should propagate correlation ID via withCorrelationId", () => {
		const logger = createLogger({
			service: "test-service",
		});

		const childLogger = logger.withCorrelationId("req-123");
		childLogger.info("Child log");

		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
		expect(loggedData.correlationId).toBe("req-123");
	});

	it("should support all log levels", () => {
		const logger = createLogger({
			service: "test-service",
		});

		logger.info("Info message");
		logger.warn("Warning message");
		logger.error("Error message");

		expect(consoleLogSpy).toHaveBeenCalledTimes(3);

		const infoLog = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
		const warnLog = JSON.parse(consoleLogSpy.mock.calls[1][0] as string);
		const errorLog = JSON.parse(consoleLogSpy.mock.calls[2][0] as string);

		expect(infoLog.level).toBe("INFO");
		expect(warnLog.level).toBe("WARN");
		expect(errorLog.level).toBe("ERROR");
	});

	it("should merge additional fields with defaults", () => {
		const logger = createLogger({
			service: "test-service",
			defaultFields: {
				version: "1.0.0",
			},
		});

		logger.info("Test message", {
			userId: "user-123",
			action: "login",
		});

		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
		expect(loggedData.version).toBe("1.0.0");
		expect(loggedData.userId).toBe("user-123");
		expect(loggedData.action).toBe("login");
	});

	it("should maintain correlation ID across child logger calls", () => {
		const logger = createLogger({
			service: "test-service",
		});

		const childLogger = logger.withCorrelationId("req-456");
		childLogger.info("First message");
		childLogger.warn("Second message");
		childLogger.error("Third message");

		expect(consoleLogSpy).toHaveBeenCalledTimes(3);

		for (let i = 0; i < 3; i++) {
			const loggedData = JSON.parse(consoleLogSpy.mock.calls[i][0] as string);
			expect(loggedData.correlationId).toBe("req-456");
		}
	});
});
