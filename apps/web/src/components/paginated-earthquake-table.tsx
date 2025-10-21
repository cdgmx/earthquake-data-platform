"use client";

import { createEarthquakeColumns } from "@earthquake/earthquakes/earthquakes/columns";
import type { ApiEarthquakeItem } from "@earthquake/earthquakes/types/api";
import {
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface PaginatedTableProps {
	data: ApiEarthquakeItem[];
	nextToken?: string;
	totalCount?: number;
}

export function PaginatedEarthquakeTable({
	data,
	nextToken,
}: PaginatedTableProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [sorting, setSorting] = useState<SortingState>([]);

	const columns = useMemo(() => createEarthquakeColumns(), []);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
	});

	const handleNextPage = () => {
		if (!nextToken) return;

		const params = new URLSearchParams(searchParams.toString());
		params.set("nextToken", nextToken);
		router.push(`?${params.toString()}`);
	};

	const handlePreviousPage = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("nextToken");
		router.push(`?${params.toString()}`);
	};

	const hasNextPage = Boolean(nextToken);
	const hasPreviousPage = searchParams.has("nextToken");

	return (
		<div className="space-y-4">
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
									No earthquakes found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between px-2">
				<div className="text-sm text-[hsl(var(--color-muted-foreground))]">
					Showing {data.length} results
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handlePreviousPage}
						disabled={!hasPreviousPage}
					>
						<ChevronLeft className="h-4 w-4 mr-1" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleNextPage}
						disabled={!hasNextPage}
					>
						Next
						<ChevronRight className="h-4 w-4 ml-1" />
					</Button>
				</div>
			</div>
		</div>
	);
}
