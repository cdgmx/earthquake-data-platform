import { cookies } from "next/headers";
import { BackendSettingsPanel } from "@/components/admin/backend-settings-panel";
import { DashboardLayout } from "@/components/dashboard";
import { resolveBackendConfig } from "@/lib/backend-config";
import { getOfflineEarthquakesStore } from "@/lib/offline-store";

export const dynamic = "force-dynamic";

export default async function BackendAdminPage() {
	const cookieStore = await cookies();
	const resolved = resolveBackendConfig(
		cookieStore,
		process.env.BACKEND_API_URL,
	);
	const offlineStore = getOfflineEarthquakesStore();

	let initialBackendUrl: string | null = null;
	if (resolved.mode === "custom") {
		initialBackendUrl = resolved.backendUrl;
	}

	let environmentBackendUrl: string | null = null;
	const envValue = process.env.BACKEND_API_URL;
	if (envValue && envValue.trim().length > 0) {
		environmentBackendUrl = envValue.trim();
	}

	return (
		<DashboardLayout>
			<div className="space-y-6 p-6 lg:p-8">
				<div className="space-y-1">
					<p className="text-xs uppercase tracking-widest text-[hsl(var(--color-muted-foreground))]">
						Admin
					</p>
					<h1 className="text-2xl font-bold tracking-tight">
						Backend Configuration
					</h1>
					<p className="text-sm text-[hsl(var(--color-muted-foreground))]">
						Control which backend powers the Explorer and manage the offline
						cache used for demos.
					</p>
				</div>

				<BackendSettingsPanel
					initialMode={resolved.mode}
					initialBackendUrl={initialBackendUrl}
					environmentBackendUrl={environmentBackendUrl}
					offlineItemCount={offlineStore.items.length}
					offlineUpdatedAt={offlineStore.updatedAt}
				/>
			</div>
		</DashboardLayout>
	);
}
