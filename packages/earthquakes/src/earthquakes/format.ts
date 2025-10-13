const magnitudeFormatter = new Intl.NumberFormat(undefined, {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

export const formatMagnitude = (value: number | null): string => {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return "—";
	}

	return magnitudeFormatter.format(value);
};

export const formatOccurredAt = (
	isoTimestamp: string,
	locale: string | undefined = undefined,
): string => {
	const date = new Date(isoTimestamp);
	if (Number.isNaN(date.getTime())) {
		return "Unknown time";
	}

	return new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
};
