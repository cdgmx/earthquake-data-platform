"use client";

import {
	CheckCircle2,
	PlugZap,
	RefreshCcw,
	ServerCog,
	ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BackendResolutionMode } from "@/lib/backend-config";

interface BackendSettingsPanelProps {
	initialMode: BackendResolutionMode;
	initialBackendUrl: string | null;
	environmentBackendUrl: string | null;
	offlineItemCount: number;
	offlineUpdatedAt: string;
}

type StatusState =
	| { state: "idle"; message?: string }
	| { state: "saving" }
	| { state: "success"; message: string }
	| { state: "error"; message: string };

const STATUS_COLORS: Record<BackendResolutionMode, string> = {
	offline: "bg-amber-100 text-amber-900",
	custom: "bg-emerald-100 text-emerald-900",
	env: "bg-sky-100 text-sky-900",
	unconfigured: "bg-slate-100 text-slate-900",
};

const modeDescriptions: Record<BackendResolutionMode, string> = {
	offline: "Serving data from the bundled offline store",
	custom: "Using a custom backend endpoint from this browser",
	env: "Using the environment-provided backend endpoint",
	unconfigured: "No backend configured; falling back to offline store",
};

export function BackendSettingsPanel({
	initialMode,
	initialBackendUrl,
	environmentBackendUrl,
	offlineItemCount,
	offlineUpdatedAt,
}: BackendSettingsPanelProps) {
	const router = useRouter();
	const inputId = useId();
	let defaultEndpoint = "";
	if (initialMode === "custom" && initialBackendUrl) {
		defaultEndpoint = initialBackendUrl;
	}
	const [endpoint, setEndpoint] = useState(defaultEndpoint);
	const [status, setStatus] = useState<StatusState>({ state: "idle" });

	const updateConfig = async (body: Record<string, unknown>) => {
		setStatus({ state: "saving" });

		const response = await fetch("/api/backend-config", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as {
				message?: string;
			} | null;
			let errorMessage = "Unable to save backend preference";
			if (payload?.message) {
				errorMessage = payload.message;
			}
			setStatus({
				state: "error",
				message: errorMessage,
			});
			return;
		}

		const payload = (await response.json().catch(() => null)) as {
			message?: string;
		} | null;
		let successMessage = "Backend preference updated";
		if (payload?.message) {
			successMessage = payload.message;
		}

		setStatus({
			state: "success",
			message: successMessage,
		});
		router.refresh();
	};

	const handleSave = async () => {
		if (endpoint.trim().length === 0) {
			setStatus({
				state: "error",
				message: "Enter a backend URL before saving",
			});
			return;
		}

		await updateConfig({ mode: "custom", backendUrl: endpoint.trim() });
	};

	const handleUseOffline = async () => {
		await updateConfig({ mode: "offline" });
	};

	const handleUseEnv = async () => {
		await updateConfig({ mode: "clear" });
	};

	const formattedUpdatedAt = new Date(offlineUpdatedAt).toLocaleString();
	const isSaving = status.state === "saving";
	let primaryButtonLabel = "Save endpoint";
	if (isSaving) {
		primaryButtonLabel = "Saving...";
	}

	let envButton: ReactNode = null;
	if (environmentBackendUrl) {
		envButton = (
			<Button
				onClick={handleUseEnv}
				variant="ghost"
				className="flex items-center gap-2"
				disabled={isSaving}
			>
				<RefreshCcw className="h-4 w-4" />
				Use env default
			</Button>
		);
	}

	let errorFeedback: ReactNode = null;
	if (status.state === "error") {
		errorFeedback = <p className="text-sm text-red-600">{status.message}</p>;
	}

	let successFeedback: ReactNode = null;
	if (status.state === "success") {
		successFeedback = (
			<p className="text-sm text-emerald-600">{status.message}</p>
		);
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<Card>
				<CardHeader className="flex flex-col gap-2">
					<CardTitle className="flex items-center gap-2 text-lg">
						<ServerCog className="h-5 w-5 text-orange-500" />
						Backend Endpoint
					</CardTitle>
					<div
						className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[initialMode]}`}
					>
						<PlugZap className="h-3.5 w-3.5" />
						{modeDescriptions[initialMode]}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={inputId}>Backend base URL</Label>
						<Input
							id={inputId}
							placeholder="https://example.execute-api.localhost.localstack.cloud:4566/local"
							value={endpoint}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setEndpoint(event.target.value)
							}
						/>
						<p className="text-xs text-[hsl(var(--color-muted-foreground))]">
							Provide the API Gateway base URL (without the /earthquakes
							suffix).
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button onClick={handleSave} disabled={status.state === "saving"}>
							{primaryButtonLabel}
						</Button>
						<Button
							onClick={handleUseOffline}
							variant="outline"
							className="flex items-center gap-2"
							disabled={status.state === "saving"}
						>
							<ShieldAlert className="h-4 w-4" />
							Use offline sample
						</Button>
						{envButton}
					</div>

					{errorFeedback}
					{successFeedback}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-col gap-2">
					<CardTitle className="flex items-center gap-2 text-lg">
						<CheckCircle2 className="h-5 w-5 text-emerald-500" />
						Offline Store Snapshot
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg border border-dashed border-[hsl(var(--color-border))] bg-[hsl(var(--color-muted))] p-4">
						<p className="text-sm font-medium">
							{offlineItemCount} events cached
						</p>
						<p className="text-xs text-[hsl(var(--color-muted-foreground))]">
							Last refreshed {formattedUpdatedAt}
						</p>
						<p className="text-xs text-[hsl(var(--color-muted-foreground))]">
							File:{" "}
							<span className="font-mono">
								apps/web/src/data/offline-earthquakes.json
							</span>
						</p>
					</div>
					<div className="space-y-2 text-sm text-[hsl(var(--color-muted-foreground))]">
						<p className="font-medium text-[hsl(var(--color-foreground))]">
							Refresh instructions
						</p>
						<ol className="list-decimal space-y-1 pl-5">
							<li>
								Export data from your backend with
								<span className="ml-1 rounded bg-[hsl(var(--color-muted))] px-1.5 py-0.5 font-mono text-xs">
									pnpm offline:sync
								</span>
								.
							</li>
							<li>
								Ensure BACKEND_API_URL or the admin endpoint matches your
								deployment.
							</li>
							<li>
								Commit the updated offline file to share sample data with the
								team.
							</li>
						</ol>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
