#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

const log = (message) => {
	process.stdout.write(`[offline-store] ${message}\n`);
};

const fail = (message) => {
	process.stderr.write(`[offline-store] ${message}\n`);
	process.exit(1);
};

let baseUrl = process.env.BACKEND_API_URL;
if (!baseUrl || baseUrl.length === 0) {
	baseUrl = process.argv[2];
}

if (!baseUrl || baseUrl.length === 0) {
	fail(
		"Provide BACKEND_API_URL env or pass the base URL as the first argument.",
	);
}

const now = Date.now();

let endtime = Number(process.env.OFFLINE_ENDTIME);
if (!Number.isFinite(endtime)) {
	endtime = now;
}

let starttime = Number(process.env.OFFLINE_STARTTIME);
if (!Number.isFinite(starttime)) {
	starttime = endtime - 7 * MILLISECONDS_IN_DAY;
}

let minmagnitude = Number(process.env.OFFLINE_MIN_MAG);
if (!Number.isFinite(minmagnitude)) {
	minmagnitude = 0;
}

let pageSize = Number(process.env.OFFLINE_PAGE_SIZE);
if (!Number.isFinite(pageSize) || pageSize <= 0) {
	pageSize = 200;
}

const buildBackendUrl = (token) => {
	const url = new URL(baseUrl);
	url.pathname = `${url.pathname.replace(/\/+$/, "")}/earthquakes`;
	url.searchParams.set("starttime", String(starttime));
	url.searchParams.set("endtime", String(endtime));
	url.searchParams.set("minmagnitude", String(minmagnitude));
	url.searchParams.set("pageSize", String(pageSize));
	if (token) {
		url.searchParams.set("nextToken", token);
	}
	return url.toString();
};

const transformEvent = (event) => {
	let magnitude = 0;
	if (typeof event.mag === "number") {
		magnitude = event.mag;
	}

	let place = "Unknown location";
	if (event.place && event.place.length > 0) {
		place = event.place;
	}

	let detailUrl = "";
	if (event.detailUrl && event.detailUrl.length > 0) {
		detailUrl = event.detailUrl;
	}

	let latitude = 0;
	if (typeof event.lat === "number") {
		latitude = event.lat;
	}

	let longitude = 0;
	if (typeof event.lon === "number") {
		longitude = event.lon;
	}

	let depthKm = 0;
	if (typeof event.depth === "number") {
		depthKm = event.depth;
	}

	return {
		id: event.eventId,
		magnitude,
		place,
		occurredAt: new Date(event.eventTsMs).toISOString(),
		detailUrl,
		coordinates: {
			latitude,
			longitude,
			depthKm,
		},
	};
};

const fetchPage = async (token) => {
	const endpoint = buildBackendUrl(token);
	const response = await fetch(endpoint, {
		headers: { accept: "application/json" },
	});

	if (!response.ok) {
		const text = await response.text();
		fail(`Backend error ${response.status}: ${text}`);
	}

	const payload = await response.json().catch(() => null);

	if (!payload || !Array.isArray(payload.items)) {
		fail("Backend returned an unexpected payload");
	}

	return {
		items: payload.items,
		nextToken: payload.nextToken,
	};
};

const collectEvents = async () => {
	const collected = [];
	let nextToken;
	let page = 0;

	do {
		page += 1;
		let tokenSuffix = "";
		if (nextToken) {
			tokenSuffix = ` (token ${nextToken})`;
		}
		log(`Fetching page ${page}${tokenSuffix}`);
		const result = await fetchPage(nextToken);
		collected.push(...result.items);
		nextToken = result.nextToken;
	} while (nextToken);

	return collected;
};

const writeOfflineStore = async (items) => {
	const payload = {
		status: "ok",
		updatedAt: new Date().toISOString(),
		items: items.map((item) => transformEvent(item)),
	};

	const outputPath = path.resolve(
		new URL("../apps/web/src/data/offline-earthquakes.json", import.meta.url)
			.pathname,
	);

	await fs.writeFile(
		outputPath,
		`${JSON.stringify(payload, null, 2)}\n`,
		"utf8",
	);
	log(`Wrote ${payload.items.length} events to ${outputPath}`);
};

const run = async () => {
	log(
		`Exporting offline store from ${baseUrl} (start=${starttime}, end=${endtime}, minMag=${minmagnitude})`,
	);
	const events = await collectEvents();
	await writeOfflineStore(events);
};

run().catch((error) => {
	let failureMessage = String(error);
	if (error instanceof Error) {
		failureMessage = error.message;
	}
	fail(failureMessage);
});
