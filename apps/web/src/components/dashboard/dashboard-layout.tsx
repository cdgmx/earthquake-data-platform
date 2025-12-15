"use client";

import { Sidebar } from "@/components/dashboard/sidebar";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
	return (
		<div className="flex min-h-screen bg-[hsl(var(--color-background))]">
			<Sidebar />
			<main className="flex-1 lg:pl-64">
				<div className="flex flex-col">{children}</div>
			</main>
		</div>
	);
}
