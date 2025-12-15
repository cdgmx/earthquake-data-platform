"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: LucideIcon;
	trend?: number;
	gradient: "orange" | "blue" | "purple" | "green" | "red";
	delay?: number;
}

const gradientClasses = {
	orange: "from-orange-500 to-amber-500",
	blue: "from-blue-500 to-cyan-500",
	purple: "from-purple-500 to-pink-500",
	green: "from-emerald-500 to-teal-500",
	red: "from-red-500 to-rose-500",
};

const iconBgClasses = {
	orange: "bg-orange-400/30",
	blue: "bg-blue-400/30",
	purple: "bg-purple-400/30",
	green: "bg-emerald-400/30",
	red: "bg-red-400/30",
};

export function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
	trend,
	gradient,
	delay = 0,
}: StatCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay }}
			whileHover={{ scale: 1.02, y: -2 }}
			className={cn(
				"relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg",
				gradientClasses[gradient],
			)}
		>
			<div className="flex items-start justify-between">
				<div className="space-y-1">
					<p className="text-sm font-medium text-white/80">{title}</p>
					<p className="text-3xl font-bold tracking-tight">{value}</p>
					{subtitle && <p className="text-xs text-white/70">{subtitle}</p>}
					{trend !== undefined && (
						<div className="flex items-center gap-1 pt-1">
							<span className="text-xs font-medium text-white/90">
								{trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(0)}%
							</span>
							<span className="text-xs text-white/60">vs yesterday</span>
						</div>
					)}
				</div>
				<div className={cn("rounded-xl p-3", iconBgClasses[gradient])}>
					<Icon className="h-6 w-6 text-white" />
				</div>
			</div>
			<div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
		</motion.div>
	);
}

interface StatCardGridProps {
	children: ReactNode;
	className?: string;
}

export function StatCardGrid({ children, className }: StatCardGridProps) {
	return (
		<div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
			{children}
		</div>
	);
}
