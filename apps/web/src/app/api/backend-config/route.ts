import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
	BACKEND_ENDPOINT_COOKIE,
	BACKEND_OFFLINE_SENTINEL,
	normalizeBackendUrl,
	resolveBackendConfig,
} from "@/lib/backend-config";

const cookieOptions = {
	httpOnly: true,
	sameSite: "lax" as const,
	secure: process.env.NODE_ENV === "production",
	path: "/",
};

type BackendConfigPayload =
	| { mode: "custom"; backendUrl: string }
	| { mode: "offline" }
	| { mode: "clear" };

const badRequest = (message: string) =>
	NextResponse.json({ message }, { status: 400 });

export async function GET(request: NextRequest) {
	const resolved = resolveBackendConfig(
		request.cookies,
		process.env.BACKEND_API_URL,
	);

	let backendUrl: string | null = null;
	if (resolved.mode === "custom") {
		backendUrl = resolved.backendUrl;
	}

	let envBackendUrl: string | null = null;
	const envValue = process.env.BACKEND_API_URL;
	if (envValue && envValue.trim().length > 0) {
		envBackendUrl = envValue.trim();
	}

	return NextResponse.json({
		mode: resolved.mode,
		backendUrl,
		resolvedBackendUrl: resolved.backendUrl,
		envBackendUrl,
	});
}

export async function POST(request: NextRequest) {
	const payload = (await request
		.json()
		.catch(() => null)) as BackendConfigPayload | null;

	if (!payload || typeof payload.mode !== "string") {
		return badRequest("Request body must include a mode field");
	}

	if (payload.mode === "offline") {
		const response = NextResponse.json({
			message: "Backend switched to offline store",
		});
		response.cookies.set(
			BACKEND_ENDPOINT_COOKIE,
			BACKEND_OFFLINE_SENTINEL,
			cookieOptions,
		);
		return response;
	}

	if (payload.mode === "clear") {
		const response = NextResponse.json({
			message: "Backend preference cleared",
		});
		response.cookies.delete(BACKEND_ENDPOINT_COOKIE);
		return response;
	}

	if (payload.mode === "custom") {
		if (typeof payload.backendUrl !== "string") {
			return badRequest("backendUrl must be provided for custom mode");
		}

		let normalizedUrl: string;

		try {
			normalizedUrl = normalizeBackendUrl(payload.backendUrl);
		} catch (error) {
			let message = "Invalid backend URL";
			if (error instanceof Error) {
				message = error.message;
			}
			return badRequest(message);
		}

		const response = NextResponse.json({
			message: "Backend endpoint saved",
		});
		response.cookies.set(BACKEND_ENDPOINT_COOKIE, normalizedUrl, cookieOptions);
		return response;
	}

	const exhaustiveCheck: never = payload;
	return badRequest("Unsupported mode");
}
