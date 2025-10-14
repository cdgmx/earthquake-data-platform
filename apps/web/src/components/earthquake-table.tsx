"use client";

import { createEarthquakeColumns } from "@earthquake/earthquakes/earthquakes/columns";
import { filterEarthquakes } from "@earthquake/earthquakes/earthquakes/filter";
import { useEarthquakeFilters } from "@earthquake/earthquakes/earthquakes/use-earthquake-filters";
import type { ApiEarthquakeItem } from "@earthquake/earthquakes/types/api";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@earthquake/ui/table";
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { FilterPanel } from "@/components/filter-panel";

type EarthquakeTableProps = {
	items: ApiEarthquakeItem[];
};

const EarthquakeTable = ({ items }: EarthquakeTableProps) => {
	const { filters, setFilters, resetFilters } = useEarthquakeFilters();

	const [sortField, setSortField] = useQueryState(
		"sort",
		parseAsString.withDefault("occurredAt"),
	);
	const [sortOrder, setSortOrder] = useQueryState(
		"order",
		parseAsString.withDefault("desc"),
	);

	const sorting: SortingState = useMemo(
		() => [
			{
				id: sortField,
				desc: sortOrder === "desc",
			},
		],
		[sortField, sortOrder],
	);

	const onSortingChange = (
		updaterOrValue: SortingState | ((old: SortingState) => SortingState),
	) => {
		const newSorting =
			typeof updaterOrValue === "function"
				? updaterOrValue(sorting)
				: updaterOrValue;

		if (newSorting.length > 0) {
			const firstSort = newSorting[0];
			if (firstSort.id !== undefined) {
				setSortField(firstSort.id);
				setSortOrder(firstSort.desc ? "desc" : "asc");
			}
		}
	};

	const filteredData = useMemo(
		() => filterEarthquakes(items, filters),
		[items, filters],
	);

	const columns = useMemo(() => createEarthquakeColumns(), []);

	const table = useReactTable({
		data: filteredData,
		columns,
		state: {
			sorting,
		},
		onSortingChange,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="space-y-6">
			<FilterPanel
				filters={filters}
				onFiltersChange={setFilters}
				onReset={resetFilters}
				totalItems={items.length}
				filteredItems={filteredData.length}
			/>

			<div className="overflow-x-auto rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										onClick={header.column.getToggleSortingHandler()}
										className={
											header.column.getCanSort()
												? "cursor-pointer select-none hover:bg-[hsl(var(--color-muted))]"
												: ""
										}
									>
										{header.isPlaceholder ? null : (
											<div className="flex items-center gap-2">
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
												{header.column.getIsSorted() ? (
													<span className="text-xs">
														{header.column.getIsSorted() === "desc" ? "↓" : "↑"}
													</span>
												) : null}
											</div>
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length > 0 ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No earthquakes match your filters.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
};

export { EarthquakeTable };
