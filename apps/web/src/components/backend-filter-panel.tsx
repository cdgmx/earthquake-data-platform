"use client";

import { Calendar, Filter, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BackendFilterPanelProps {
	onApply?: () => void;
}

export function BackendFilterPanel({ onApply }: BackendFilterPanelProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const starttimeId = useId();
	const endtimeId = useId();
	const minmagnitudeId = useId();
	const pageSizeId = useId();

	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const [starttime, setStarttime] = useState(
		searchParams.get("starttime") || sevenDaysAgo.toISOString().slice(0, 16),
	);
	const [endtime, setEndtime] = useState(
		searchParams.get("endtime") || now.toISOString().slice(0, 16),
	);
	const [minmagnitude, setMinmagnitude] = useState(
		searchParams.get("minmagnitude") || "0",
	);
	const [pageSize, setPageSize] = useState(
		searchParams.get("pageSize") || "50",
	);

	const handleApply = () => {
		const params = new URLSearchParams();

		const startDate = new Date(starttime);
		const endDate = new Date(endtime);

		params.set("starttime", String(startDate.getTime()));
		params.set("endtime", String(endDate.getTime()));
		params.set("minmagnitude", minmagnitude);
		params.set("pageSize", pageSize);

		router.push(`?${params.toString()}`);
		onApply?.();
	};

	const handleReset = () => {
		setStarttime(sevenDaysAgo.toISOString().slice(0, 16));
		setEndtime(now.toISOString().slice(0, 16));
		setMinmagnitude("0");
		setPageSize("50");

		const params = new URLSearchParams();
		params.set("starttime", String(sevenDaysAgo.getTime()));
		params.set("endtime", String(now.getTime()));
		params.set("minmagnitude", "0");
		params.set("pageSize", "50");

		router.push(`?${params.toString()}`);
		onApply?.();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Filter className="h-5 w-5" />
					Filter Earthquakes
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<div className="space-y-2">
						<Label htmlFor={starttimeId} className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							Start Time
						</Label>
						<Input
							id={starttimeId}
							type="datetime-local"
							value={starttime}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setStarttime(e.target.value)
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor={endtimeId} className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							End Time
						</Label>
						<Input
							id={endtimeId}
							type="datetime-local"
							value={endtime}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setEndtime(e.target.value)
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor={minmagnitudeId}>Minimum Magnitude</Label>
						<Input
							id={minmagnitudeId}
							type="number"
							step="0.1"
							min="0"
							max="10"
							value={minmagnitude}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setMinmagnitude(e.target.value)
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor={pageSizeId}>Results Per Page</Label>
						<Input
							id={pageSizeId}
							type="number"
							min="1"
							max="100"
							value={pageSize}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setPageSize(e.target.value)
							}
						/>
					</div>
				</div>

				<div className="mt-4 flex gap-2">
					<Button onClick={handleApply} className="flex-1">
						Apply Filters
					</Button>
					<Button
						onClick={handleReset}
						variant="outline"
						className="flex items-center gap-2"
					>
						<RotateCcw className="h-4 w-4" />
						Reset
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
