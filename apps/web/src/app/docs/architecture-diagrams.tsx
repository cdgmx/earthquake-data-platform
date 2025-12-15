"use client";

import { MermaidDiagram } from "./mermaid-diagram";

const systemContextDiagram = `C4Context
title Earthquake Data Platform — System Context

Person(admin, "Admin", "Views data/analytics; runs dev tools")
System(spa, "Admin Dashboard (Next.js 15)", "Admin-only UI for data and analytics workflows")
System_Ext(usgs, "USGS FDSN Event API", "Earthquake catalog (GeoJSON)")

System_Boundary(sys, "Earthquake Data Platform") {
  System(api, "Earthquake Data API", "Stores, queries, analyzes earthquakes; logs requests")
}

Rel(admin, spa, "Operate dashboard", "HTTPS")
Rel(spa, api, "Call REST endpoints", "HTTPS / JSON")
Rel(api, usgs, "Fetch recent events", "HTTP GET")`;

const containerDiagram = `C4Container
title Earthquake Data Platform — Container Diagram

Person(admin, "Admin", "Operates dashboard")
System(spa, "Admin Dashboard", "Next.js 15")

System_Boundary(platform, "Earthquake Data Platform") {
  Container(apigw, "API Gateway", "REST", "Routes calls to Lambda")
  Container(queryFn, "Query Lambda", "TypeScript", "Queries DynamoDB")
  Container(analyticsFn, "Analytics Lambda", "TypeScript", "Aggregates logs")
  Container(ingFn, "Ingestion Lambda", "TypeScript", "Fetches USGS feed")
  ContainerDb(db, "DynamoDB", "NoSQL", "Events + logs")
}

System_Ext(usgs, "USGS API", "GeoJSON")

Rel(admin, spa, "Use")
Rel(spa, apigw, "API calls")
Rel(apigw, queryFn, "/earthquakes")
Rel(apigw, analyticsFn, "/analytics")
Rel(apigw, ingFn, "/ingest")
Rel(queryFn, db, "Query")
Rel(analyticsFn, db, "Read logs")
Rel(ingFn, db, "Write events")
Rel(ingFn, usgs, "Fetch")`;

const flowDiagram = `flowchart TB
    subgraph Client["Client Layer"]
        Admin["Admin Dashboard<br/>(Next.js 15)"]
    end

    subgraph Gateway["API Gateway"]
        APIGW["REST API Gateway"]
    end

    subgraph Lambda["Lambda Functions"]
        Ingest["Ingestion Lambda<br/>POST /ingest/recent"]
        Query["Query Lambda<br/>GET /earthquakes"]
        Analytics["Analytics Lambda<br/>GET /analytics/popular-filters"]
    end

    subgraph Storage["Data Layer"]
        DynamoDB[("DynamoDB<br/>Single Table Design")]
    end

    subgraph External["External Services"]
        USGS["USGS API<br/>earthquake.usgs.gov"]
    end

    Admin --> APIGW
    APIGW --> Ingest
    APIGW --> Query
    APIGW --> Analytics
    
    Ingest --> DynamoDB
    Ingest --> USGS
    Query --> DynamoDB
    Analytics --> DynamoDB

    classDef client fill:#3b82f6,stroke:#2563eb,color:#fff
    classDef gateway fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef lambda fill:#22c55e,stroke:#16a34a,color:#fff
    classDef storage fill:#f59e0b,stroke:#d97706,color:#fff
    classDef external fill:#ef4444,stroke:#dc2626,color:#fff

    class Admin client
    class APIGW gateway
    class Ingest,Query,Analytics lambda
    class DynamoDB storage
    class USGS external`;

const sequenceDiagram = `sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Lambda as Query Lambda
    participant DB as DynamoDB

    Client->>Gateway: GET /earthquakes?starttime=...&endtime=...
    Gateway->>Lambda: Invoke with query params
    Lambda->>Lambda: Validate parameters
    Lambda->>DB: Query GSI (TimeOrderedIndex)
    DB-->>Lambda: Return items + LastEvaluatedKey
    Lambda->>Lambda: Apply magnitude filter
    Lambda->>Lambda: Generate nextToken (if more results)
    Lambda->>DB: Write request log (async)
    Lambda-->>Gateway: JSON response
    Gateway-->>Client: 200 OK with items`;

export function ArchitectureDiagrams() {
	return (
		<div className="space-y-8">
			<div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
				<h2 className="mb-6 text-2xl font-bold text-gray-900">
					Architecture Overview
				</h2>
				<p className="mb-8 text-gray-600">
					The Earthquake Data Platform is built on AWS serverless architecture,
					providing scalable earthquake data ingestion, querying, and analytics.
				</p>

				<div className="grid gap-8">
					<MermaidDiagram
						chart={flowDiagram}
						title="System Architecture"
					/>
					<MermaidDiagram
						chart={sequenceDiagram}
						title="Query Flow Sequence"
					/>
				</div>
			</div>
		</div>
	);
}
