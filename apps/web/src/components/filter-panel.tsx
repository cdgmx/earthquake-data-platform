"use client";

import type { EarthquakeFilters } from "@earthquake/earthquakes/earthquakes/use-earthquake-filters";

import { Button } from "@earthquake/ui/button";
import { Input } from "@earthquake/ui/input";
import { Label } from "@earthquake/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@earthquake/ui/sheet";
import { Slider } from "@earthquake/ui/slider";
import { useId, useState } from "react";

interface FilterPanelProps {
	filters: EarthquakeFilters;
	onFiltersChange: (filters: Partial<EarthquakeFilters>) => void;
	onReset: () => void;
	totalItems: number;
	filteredItems: number;
}

const FilterContent = ({
	filters,
	onFiltersChange,
	onReset,
	totalItems,
	filteredItems,
}: FilterPanelProps) => {
	const placeSearchId = useId();
	const magnitudeRangeId = useId();
	const depthRangeId = useId();
	const startDateId = useId();
	const endDateId = useId();

	const [magnitudeRange, setMagnitudeRange] = useState([
		filters.minMagnitude ?? 0,
		filters.maxMagnitude ?? 10,
	]);
	const [depthRange, setDepthRange] = useState([
		filters.minDepth ?? 0,
		filters.maxDepth ?? 700,
	]);

	const handleMagnitudeCommit = (values: number[]) => {
		onFiltersChange({
			minMagnitude: values[0],
			maxMagnitude: values[1],
		});
	};

	const handleDepthCommit = (values: number[]) => {
		onFiltersChange({
			minDepth: values[0],
			maxDepth: values[1],
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium">
						{filteredItems} of {totalItems} earthquakes
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={onReset}>
					Reset Filters
				</Button>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor={placeSearchId}>Location Search</Label>
					<Input
						id={placeSearchId}
						type="text"
						placeholder="Search by place name..."
						value={filters.placeSearch}
						onChange={(e) => onFiltersChange({ placeSearch: e.target.value })}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={magnitudeRangeId}>
						Magnitude: {magnitudeRange[0].toFixed(1)} -{" "}
						{magnitudeRange[1].toFixed(1)}
					</Label>
					<Slider
						id={magnitudeRangeId}
						min={0}
						max={10}
						step={0.1}
						value={magnitudeRange}
						onValueChange={setMagnitudeRange}
						onValueCommit={handleMagnitudeCommit}
						className="w-full"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={depthRangeId}>
						Depth: {depthRange[0].toFixed(0)} - {depthRange[1].toFixed(0)} km
					</Label>
					<Slider
						id={depthRangeId}
						min={0}
						max={700}
						step={10}
						value={depthRange}
						onValueChange={setDepthRange}
						onValueCommit={handleDepthCommit}
						className="w-full"
					/>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor={startDateId}>Start Date</Label>
						<Input
							id={startDateId}
							type="date"
							value={filters.startDate ?? ""}
							onChange={(e) =>
								onFiltersChange({
									startDate: e.target.value.length > 0 ? e.target.value : null,
								})
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={endDateId}>End Date</Label>
						<Input
							id={endDateId}
							type="date"
							value={filters.endDate ?? ""}
							onChange={(e) =>
								onFiltersChange({
									endDate: e.target.value.length > 0 ? e.target.value : null,
								})
							}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export const FilterPanel = (props: FilterPanelProps) => {
	return (
		<>
			<div className="hidden lg:block">
				<FilterContent {...props} />
			</div>

			<div className="lg:hidden">
				<Sheet>
					<SheetTrigger asChild>
						<Button variant="outline" className="w-full">
							Filters ({props.filteredItems} of {props.totalItems})
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-[300px] sm:w-[400px]">
						<SheetHeader>
							<SheetTitle>Filter Earthquakes</SheetTitle>
							<SheetDescription>
								Narrow down earthquakes by magnitude, depth, date, and location.
							</SheetDescription>
						</SheetHeader>
						<div className="mt-6">
							<FilterContent {...props} />
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</>
	);
};
