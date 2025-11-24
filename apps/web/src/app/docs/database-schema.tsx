"use client";

import type { ReactNode } from "react";
import { MermaidDiagram } from "./mermaid-diagram";

const schemaFlowchart = `flowchart TB
    subgraph table["earthquake-events Table"]
        direction TB
        config["Billing: On-demand\\nPrimary: pk (S), sk (S)\\nTTL: ttl"]
    end

    subgraph entities["Entity Types"]
        direction LR
        event["EVENT Entity\\npk = EVENT#&lt;usgsEventId&gt;\\nsk = EVENT\\nmag, place, lat, lon, depth"]
        log["LOG Entity\\npk = LOG#&lt;YYYYMMDD&gt;\\nsk = &lt;epochMs&gt;#&lt;uuid&gt;\\nstatus, latencyMs, ttl"]
    end

    subgraph gsi["TimeOrderedIndex GSI"]
        direction TB
        gsiConfig["Partition: gsi1pk = DAY#YYYYMMDD\\nSort: gsi1sk = eventTsMs\\nProjection: ALL"]
    end

    subgraph patterns["Access Patterns"]
        direction TB
        insertEvent["Insert Event\\nPutItem + attribute_not_exists"]
        queryDay["Query by Day\\nGSI Query + mag filter"]
        insertLog["Insert Log\\nPutItem with TTL"]
        queryLogs["Query Logs\\nBase table Query"]
    end

    table --> entities
    event --> gsi
    insertEvent --> event
    queryDay --> gsi
    insertLog --> log
    queryLogs --> log

    style table fill:#f8fafc,stroke:#e2e8f0
    style entities fill:#f0fdf4,stroke:#bbf7d0
    style gsi fill:#eff6ff,stroke:#bfdbfe
    style patterns fill:#fef3c7,stroke:#fde68a
    style event fill:#22c55e,stroke:#16a34a,color:#fff
    style log fill:#3b82f6,stroke:#2563eb,color:#fff
    style gsiConfig fill:#60a5fa,stroke:#3b82f6,color:#fff
    style insertEvent fill:#fbbf24,stroke:#f59e0b
    style queryDay fill:#fbbf24,stroke:#f59e0b
    style insertLog fill:#fbbf24,stroke:#f59e0b
    style queryLogs fill:#fbbf24,stroke:#f59e0b
`;

interface Field {
	name: string;
	type: string;
	required: boolean;
	description: string;
}

interface CardProps {
	title: string;
	subtitle: string;
	children: ReactNode;
}

const tableConfiguration = [
	{ label: "Table Name", value: "earthquake-events" },
	{ label: "Billing Mode", value: "On-demand (PAY_PER_REQUEST)" },
	{ label: "Region", value: "us-east-1 (LocalStack / AWS)" },
	{ label: "Primary Key", value: "pk (partition key), sk (sort key)" },
	{ label: "Entities", value: "Earthquake events, request logs" },
	{ label: "TTL Attribute", value: "ttl (epoch seconds)" },
];

const gsiConfiguration = [
	{ label: "Index Name", value: "TimeOrderedIndex" },
	{ label: "Purpose", value: "Query events by day bucket" },
	{ label: "Partition Key", value: "gsi1pk (DAY#YYYYMMDD)" },
	{ label: "Sort Key", value: "gsi1sk (eventTsMs)" },
	{ label: "Projection", value: "ALL attributes" },
];

const eventFields: Field[] = [
	{
		name: "pk",
		type: "String",
		required: true,
		description: "EVENT#<usgsEventId> composite identifier",
	},
	{
		name: "sk",
		type: "String",
		required: true,
		description: "Literal EVENT for scoped queries",
	},
	{
		name: "entity",
		type: "String",
		required: true,
		description: "Always EVENT for type guards",
	},
	{
		name: "eventId",
		type: "String",
		required: true,
		description: "USGS event identifier (<= 64 chars)",
	},
	{
		name: "eventTsMs",
		type: "Number",
		required: true,
		description: "Event timestamp (epoch ms)",
	},
	{
		name: "mag",
		type: "Number",
		required: true,
		description: "Magnitude clamped to -2.0 .. 10.0",
	},
	{
		name: "place",
		type: "String",
		required: true,
		description: "Human-readable location (<= 512 chars)",
	},
	{
		name: "lat",
		type: "Number",
		required: true,
		description: "Latitude -90 .. 90",
	},
	{
		name: "lon",
		type: "Number",
		required: true,
		description: "Longitude -180 .. 180",
	},
	{
		name: "depth",
		type: "Number | null",
		required: false,
		description: "Depth in km (non-negative)",
	},
	{
		name: "dayBucket",
		type: "String",
		required: true,
		description: "YYYYMMDD derived from eventTsMs",
	},
	{
		name: "gsi1pk",
		type: "String",
		required: true,
		description: "DAY#<dayBucket> partition for GSI",
	},
	{
		name: "gsi1sk",
		type: "Number",
		required: true,
		description: "eventTsMs reused as GSI sort key",
	},
	{
		name: "source",
		type: "String",
		required: true,
		description: "Data source (USGS)",
	},
	{
		name: "ingestedAt",
		type: "Number",
		required: true,
		description: "Ingestion timestamp (epoch ms)",
	},
];

const requestLogFields: Field[] = [
	{
		name: "pk",
		type: "String",
		required: true,
		description: "LOG#<YYYYMMDD> day bucket",
	},
	{
		name: "sk",
		type: "String",
		required: true,
		description: "<epochMs>#<requestId> composite sorter",
	},
	{
		name: "entity",
		type: "String",
		required: true,
		description: "Always LOG",
	},
	{
		name: "logType",
		type: "String",
		required: true,
		description: "INGEST or QUERY",
	},
	{
		name: "requestId",
		type: "String",
		required: true,
		description: "UUID v4 for traceability",
	},
	{
		name: "timestamp",
		type: "Number",
		required: true,
		description: "Request start time (epoch ms)",
	},
	{
		name: "route",
		type: "String",
		required: true,
		description: "API path (/ingest/recent, /earthquakes, etc.)",
	},
	{
		name: "status",
		type: "Number",
		required: true,
		description: "HTTP status code (200-599)",
	},
	{
		name: "latencyMs",
		type: "Number",
		required: true,
		description: "End-to-end latency",
	},
	{
		name: "fetched",
		type: "Number",
		required: false,
		description: "Events fetched from upstream (INGEST)",
	},
	{
		name: "upserted",
		type: "Number",
		required: false,
		description: "Events inserted (INGEST)",
	},
	{
		name: "skipped",
		type: "Number",
		required: false,
		description: "Duplicates filtered (INGEST)",
	},
	{
		name: "retries",
		type: "Number",
		required: false,
		description: "Retry attempts",
	},
	{
		name: "upstreamSize",
		type: "Number",
		required: false,
		description: "USGS payload size in bytes",
	},
	{
		name: "upstreamHash",
		type: "String",
		required: false,
		description: "SHA-256 fingerprint of upstream payload",
	},
	{
		name: "starttime",
		type: "Number",
		required: false,
		description: "Query parameter, epoch ms",
	},
	{
		name: "endtime",
		type: "Number",
		required: false,
		description: "Query parameter, epoch ms",
	},
	{
		name: "minmagnitude",
		type: "Number",
		required: false,
		description: "Query parameter, magnitude floor",
	},
	{
		name: "pageSize",
		type: "Number",
		required: false,
		description: "Page size used for query",
	},
	{
		name: "resultCount",
		type: "Number",
		required: false,
		description: "Returned items for the page",
	},
	{
		name: "hasNextToken",
		type: "Boolean",
		required: false,
		description: "Indicates paginated response",
	},
	{
		name: "bucketsScanned",
		type: "Number",
		required: false,
		description: "Day buckets traversed during query",
	},
	{
		name: "error",
		type: "String",
		required: false,
		description: "Stable error code for failures",
	},
	{
		name: "ttl",
		type: "Number",
		required: true,
		description: "Expiration timestamp (now + 7 days)",
	},
];

const accessPatterns = [
	{
		title: "Insert Event (Idempotent)",
		details:
			"PutItem with condition attribute_not_exists(pk) to prevent duplicates during ingestion.",
	},
	{
		title: "Query Events by Day",
		details:
			"Query TimeOrderedIndex with gsi1pk = DAY#YYYYMMDD and gsi1sk BETWEEN bounds; filter on magnitude if needed.",
	},
	{
		title: "Insert Request Log",
		details:
			"Unconditional PutItem scoped by LOG#YYYYMMDD partition; ttl controls retention.",
	},
	{
		title: "Query Request Logs",
		details:
			"Query base table where pk = LOG#YYYYMMDD to inspect ingestion or query activity.",
	},
];

function SchemaCard({ title, subtitle, children }: CardProps) {
	return (
		<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
			<p className="mb-4 text-sm text-gray-500">{subtitle}</p>
			{children}
		</div>
	);
}

function KeyValueList({ items }: { items: { label: string; value: string }[] }) {
	return (
		<dl className="grid gap-3 text-sm text-gray-700">
			{items.map((item) => (
				<div key={item.label} className="flex flex-col rounded-lg bg-gray-50 p-3">
					<dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
						{item.label}
					</dt>
					<dd className="mt-1 font-medium text-gray-900">{item.value}</dd>
				</div>
			))}
		</dl>
	);
}

function FieldTable({ fields, title }: { fields: Field[]; title: string }) {
	return (
		<div>
			<h4 className="text-base font-semibold text-gray-900">{title}</h4>
			<div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
				<table className="min-w-full divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">
								Field
							</th>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">
								Type
							</th>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">
								Requirement
							</th>
							<th className="px-4 py-2 text-left font-semibold text-gray-600">
								Notes
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{fields.map((field) => {
							let requirement = "Optional";
							if (field.required) {
								requirement = "Required";
							}

							return (
								<tr key={field.name}>
									<td className="px-4 py-2 font-medium text-gray-900">
										{field.name}
									</td>
									<td className="px-4 py-2 text-gray-700">{field.type}</td>
									<td className="px-4 py-2 text-gray-700">{requirement}</td>
									<td className="px-4 py-2 text-gray-600">{field.description}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export function DatabaseSchema() {
	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">Database Schema</h2>
				<p className="mt-2 text-gray-600">
					The platform uses a single DynamoDB table with composite keys, a
					time-ordered GSI, and TTL-driven log retention. The schema below
					captures every attribute, key pattern, and access strategy referenced by
					our ingestion and query services.
				</p>
			</div>

			<SchemaCard title="Visual Schema" subtitle="Single-table design with GSI and access patterns">
				<MermaidDiagram chart={schemaFlowchart} />
			</SchemaCard>

			<div className="grid gap-6 lg:grid-cols-2">
				<SchemaCard title="Table Configuration" subtitle="Physical layout">
					<KeyValueList items={tableConfiguration} />
				</SchemaCard>
				<SchemaCard title="TimeOrderedIndex" subtitle="Global secondary index">
					<KeyValueList items={gsiConfiguration} />
				</SchemaCard>
			</div>

			<SchemaCard
				title="Earthquake Event Entity"
				subtitle="Immutable seismic event records"
			>
				<FieldTable fields={eventFields} title="Attributes" />
			</SchemaCard>

			<SchemaCard
				title="Request Log Entity"
				subtitle="Operational telemetry for ingestion/query endpoints"
			>
				<FieldTable fields={requestLogFields} title="Attributes" />
			</SchemaCard>

			<SchemaCard
				title="Canonical Access Patterns"
				subtitle="How services interact with the table"
			>
				<div className="space-y-4">
					{accessPatterns.map((pattern) => (
						<div key={pattern.title} className="rounded-lg border border-gray-200 p-4">
							<h4 className="text-base font-semibold text-gray-900">
								{pattern.title}
							</h4>
							<p className="mt-1 text-sm text-gray-600">{pattern.details}</p>
						</div>
					))}
				</div>
			</SchemaCard>
		</div>
	);
}
