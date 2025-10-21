"use client";

import type { ApiEarthquakeItem } from "@earthquake/schemas";
import { useRouter, useSearchParams } from "next/navigation";
import { columns } from "./columns";
import { DataTable } from "./data-table";

interface EarthquakeDataTableProps {
	data: ApiEarthquakeItem[];
	nextToken?: string;
}

export function EarthquakeDataTable({
	data,
	nextToken,
}: EarthquakeDataTableProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

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

	const hasPreviousPage = searchParams.has("nextToken");

	return (
		<DataTable
			columns={columns}
			data={data}
			nextToken={nextToken}
			onNextPage={handleNextPage}
			onPreviousPage={handlePreviousPage}
			hasPreviousPage={hasPreviousPage}
		/>
	);
}
