"use client";

import mermaid from "mermaid";
import { useEffect, useId, useState } from "react";

interface MermaidDiagramProps {
	chart: string;
	title?: string;
}

mermaid.initialize({
	startOnLoad: false,
	theme: "base",
	themeVariables: {
		primaryColor: "#3b82f6",
		primaryTextColor: "#ffffff",
		primaryBorderColor: "#2563eb",
		secondaryColor: "#22c55e",
		secondaryTextColor: "#ffffff",
		secondaryBorderColor: "#16a34a",
		tertiaryColor: "#f1f5f9",
		tertiaryTextColor: "#1e293b",
		tertiaryBorderColor: "#cbd5e1",
		lineColor: "#64748b",
		textColor: "#1e293b",
		fontFamily: "Inter, system-ui, sans-serif",
	},
	securityLevel: "loose",
	flowchart: {
		useMaxWidth: true,
		htmlLabels: true,
		curve: "basis",
	},
});

export function MermaidDiagram({ chart, title }: MermaidDiagramProps) {
	const id = useId().replace(/:/g, "");
	const [svg, setSvg] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const renderDiagram = async () => {
			try {
				const { svg: renderedSvg } = await mermaid.render(
					`mermaid-${id}`,
					chart,
				);
				setSvg(renderedSvg);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to render diagram");
			}
		};

		renderDiagram();
	}, [chart, id]);

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
				<p className="font-medium">Failed to render diagram</p>
				<pre className="mt-2 text-sm">{error}</pre>
			</div>
		);
	}

	return (
		<div className="mermaid-container">
			{title && (
				<h3 className="mb-4 text-lg font-semibold text-gray-800">{title}</h3>
			)}
			<div
				className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid generates safe SVG
				dangerouslySetInnerHTML={{ __html: svg }}
			/>
		</div>
	);
}
