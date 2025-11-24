export const BACKEND_ENDPOINT_COOKIE = "backendEndpoint";
export const BACKEND_OFFLINE_SENTINEL = "__offline__" as const;

export type BackendResolutionMode =
	| "offline"
	| "custom"
	| "env"
	| "unconfigured";

interface CookieStore {
	get(name: string): { value: string } | undefined;
}

export interface ResolvedBackendConfig {
	backendUrl: string | null;
	mode: BackendResolutionMode;
}

export const resolveBackendConfig = (
	cookies: CookieStore | undefined,
	envBackendUrl?: string | null,
): ResolvedBackendConfig => {
	const cookieValue = cookies?.get(BACKEND_ENDPOINT_COOKIE)?.value?.trim();

	if (cookieValue === BACKEND_OFFLINE_SENTINEL) {
		return { backendUrl: null, mode: "offline" };
	}

	if (cookieValue && cookieValue.length > 0) {
		return { backendUrl: cookieValue, mode: "custom" };
	}

	if (envBackendUrl && envBackendUrl.trim().length > 0) {
		return { backendUrl: envBackendUrl.trim(), mode: "env" };
	}

	return { backendUrl: null, mode: "unconfigured" };
};

export const normalizeBackendUrl = (value: string): string => {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new Error("Backend URL cannot be empty");
	}

	let parsed: URL;

	try {
		parsed = new URL(trimmed);
	} catch (_error) {
		throw new Error("Backend URL must be a valid absolute URL");
	}

	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		throw new Error("Backend URL must use http or https");
	}

	const normalizedPath = parsed.pathname.replace(/\/+$/, "");
	return `${parsed.origin}${normalizedPath}`;
};
