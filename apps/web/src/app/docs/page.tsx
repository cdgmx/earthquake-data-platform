import type { Metadata } from "next";
import { ArchitectureDiagrams } from "./architecture-diagrams";
import { DatabaseSchema } from "./database-schema";
import { RedocStandalone } from "./redoc-standalone";

export const metadata: Metadata = {
	title: "API Documentation | Earthquake Data Platform",
	description:
		"Comprehensive API documentation for the Earthquake Data Platform, powered by Redoc.",
	openGraph: {
		title: "Earthquake Data Platform API Documentation",
		description:
			"Interactive API reference for querying earthquake data, triggering ingestion, and accessing analytics.",
		type: "website",
	},
};

export default function ApiDocsPage() {
	return (
		<div className="min-h-screen">
			<header className="border-b border-gray-200 bg-white px-6 py-4">
				<div className="mx-auto max-w-7xl">
					<h1 className="text-2xl font-bold text-gray-900">
						Earthquake Data Platform
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						API Documentation &amp; Architecture Reference
					</p>
				</div>
			</header>

			<nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-6 py-3 backdrop-blur">
				<div className="mx-auto flex max-w-7xl gap-4">
					<a
						href="#architecture"
						className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
					>
						Architecture
					</a>
					<a
						href="#database-schema"
						className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
					>
						Database Schema
					</a>
					<a
						href="#api-reference"
						className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
					>
						API Reference
					</a>
				</div>
			</nav>

			<main>
				<section id="architecture" className="px-6 py-8">
					<div className="mx-auto max-w-7xl">
						<ArchitectureDiagrams />
					</div>
				</section>

				<section id="database-schema" className="border-t border-gray-200 bg-gray-50 px-6 py-8">
					<div className="mx-auto max-w-7xl">
						<DatabaseSchema />
					</div>
				</section>

				<section id="api-reference" className="border-t border-gray-200">
					<div className="mx-auto max-w-7xl px-6 py-4">
						<h2 className="text-xl font-bold text-gray-900">API Reference</h2>
						<p className="mt-1 text-sm text-gray-500">
							Interactive documentation for all API endpoints
						</p>
					</div>
					<RedocStandalone specUrl="/openapi.yaml" />
				</section>
			</main>
		</div>
	);
}
