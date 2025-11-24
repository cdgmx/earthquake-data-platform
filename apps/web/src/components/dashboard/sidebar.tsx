"use client";

import { motion } from "framer-motion";
import {
	Activity,
	BarChart3,
	Calendar,
	Globe,
	Home,
	MapIcon,
	ServerCog,
	Settings,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/dashboard", icon: Home, label: "Dashboard" },
	{ href: "/earthquakes", icon: Activity, label: "Explorer" },
	{ href: "/earthquakes/map", icon: MapIcon, label: "Live Map" },
	{ href: "/earthquakes/analytics", icon: BarChart3, label: "Analytics" },
	{ href: "/earthquakes/trends", icon: TrendingUp, label: "Trends" },
	{ href: "/earthquakes/calendar", icon: Calendar, label: "Calendar" },
	{ href: "/earthquakes/regions", icon: Globe, label: "Regions" },
];

const bottomNavItems = [
	{ href: "/settings", icon: Settings, label: "Settings" },
	{ href: "/admin/backend", icon: ServerCog, label: "Backend Admin" },
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<motion.aside
			initial={{ x: -20, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-[hsl(var(--color-border))] bg-[hsl(var(--color-card))] lg:block"
		>
			<div className="flex h-full flex-col">
				<div className="flex h-16 items-center gap-3 border-b border-[hsl(var(--color-border))] px-6">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
						<Activity className="h-5 w-5 text-white" />
					</div>
					<div>
						<h1 className="text-lg font-semibold">Earthquake</h1>
						<p className="text-xs text-[hsl(var(--color-muted-foreground))]">
							Monitoring System
						</p>
					</div>
				</div>

				<nav className="flex-1 space-y-1 px-3 py-4">
					{navItems.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
									isActive
										? "bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-600"
										: "text-[hsl(var(--color-muted-foreground))] hover:bg-[hsl(var(--color-muted))] hover:text-[hsl(var(--color-foreground))]",
								)}
							>
								{isActive && (
									<motion.div
										layoutId="activeNav"
										className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-orange-500 to-red-600"
									/>
								)}
								<item.icon
									className={cn(
										"h-5 w-5 transition-colors",
										isActive
											? "text-orange-600"
											: "text-[hsl(var(--color-muted-foreground))] group-hover:text-[hsl(var(--color-foreground))]",
									)}
								/>
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="border-t border-[hsl(var(--color-border))] px-3 py-4">
					{bottomNavItems.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
									isActive
										? "bg-[hsl(var(--color-muted))] text-[hsl(var(--color-foreground))]"
										: "text-[hsl(var(--color-muted-foreground))] hover:bg-[hsl(var(--color-muted))] hover:text-[hsl(var(--color-foreground))]",
								)}
							>
								<item.icon className="h-5 w-5" />
								{item.label}
							</Link>
						);
					})}
				</div>
			</div>
		</motion.aside>
	);
}
