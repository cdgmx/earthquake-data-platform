"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

interface RedocStandaloneProps {
	specUrl: string;
}

export function RedocStandalone({ specUrl }: RedocStandaloneProps) {
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		if (isLoaded && typeof window !== "undefined") {
			const Redoc = (window as unknown as { Redoc?: RedocLib }).Redoc;
			if (Redoc) {
				const container = document.getElementById("redoc-container");
				if (container) {
					container.innerHTML = "";
					Redoc.init(specUrl, redocOptions, container);
				}
			}
		}
	}, [isLoaded, specUrl]);

	return (
		<>
			<Script
				src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"
				strategy="afterInteractive"
				onLoad={() => setIsLoaded(true)}
			/>
			<div id="redoc-container" className="redoc-wrapper">
				{!isLoaded && (
					<div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
						<div className="text-center">
							<div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
							<p className="text-gray-600 dark:text-gray-400">
								Loading API Documentation...
							</p>
						</div>
					</div>
				)}
			</div>
		</>
	);
}

interface RedocLib {
	init: (
		specUrl: string,
		options: RedocOptions,
		element: HTMLElement,
	) => void;
}

interface RedocOptions {
	theme?: {
		colors?: {
			primary?: { main?: string };
			success?: { main?: string };
			warning?: { main?: string };
			error?: { main?: string };
			text?: { primary?: string };
			http?: {
				get?: string;
				post?: string;
				put?: string;
				delete?: string;
			};
		};
		typography?: {
			fontSize?: string;
			fontFamily?: string;
			headings?: { fontFamily?: string };
			code?: { fontSize?: string; fontFamily?: string };
		};
		sidebar?: {
			backgroundColor?: string;
			textColor?: string;
		};
		rightPanel?: {
			backgroundColor?: string;
		};
	};
	scrollYOffset?: number;
	hideDownloadButton?: boolean;
	expandResponses?: string;
	requiredPropsFirst?: boolean;
	sortPropsAlphabetically?: boolean;
	pathInMiddlePanel?: boolean;
	hideHostname?: boolean;
	nativeScrollbars?: boolean;
	jsonSampleExpandLevel?: number | string;
}

const redocOptions: RedocOptions = {
	theme: {
		colors: {
			primary: {
				main: "#3b82f6",
			},
			success: {
				main: "#22c55e",
			},
			warning: {
				main: "#f59e0b",
			},
			error: {
				main: "#ef4444",
			},
			text: {
				primary: "#1f2937",
			},
			http: {
				get: "#22c55e",
				post: "#3b82f6",
				put: "#f59e0b",
				delete: "#ef4444",
			},
		},
		typography: {
			fontSize: "15px",
			fontFamily: "Inter, system-ui, sans-serif",
			headings: {
				fontFamily: "Inter, system-ui, sans-serif",
			},
			code: {
				fontSize: "13px",
				fontFamily: "JetBrains Mono, Menlo, Monaco, monospace",
			},
		},
		sidebar: {
			backgroundColor: "#f9fafb",
			textColor: "#374151",
		},
		rightPanel: {
			backgroundColor: "#1e293b",
		},
	},
	scrollYOffset: 0,
	hideDownloadButton: false,
	expandResponses: "200,201",
	requiredPropsFirst: true,
	sortPropsAlphabetically: false,
	pathInMiddlePanel: false,
	hideHostname: false,
	nativeScrollbars: false,
	jsonSampleExpandLevel: 2,
};
