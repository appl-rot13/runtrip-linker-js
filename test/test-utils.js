import { expect, vi } from "vitest";

export function createEnv(initialJournalId) {
	const userId = "1000";

	const map = new Map();
	if (initialJournalId != null) {
		map.set(userId, initialJournalId);
	}

	return {
		KV: {
			get: vi.fn(async (key) => map.get(key) ?? null),
			put: vi.fn(async (key, value) => map.set(key, value)),
		},

		RUNTRIP_USER_ID: userId,

		TWITTER_API_KEY: "",
		TWITTER_API_KEY_SECRET: "",
		TWITTER_ACCESS_TOKEN: "",
		TWITTER_ACCESS_TOKEN_SECRET: "",
	};
}

export function createJsonResponse(value, options = {}) {
	return new Response(JSON.stringify(value), {
		headers: { "Content-Type": "application/json" },
		...options,
	});
}

export function createImageResponse(value, options = {}) {
	return new Response(Uint8Array.from(value), {
		headers: { "Content-Type": "image/jpeg" },
		...options,
	});
}

export function expectUrl(resource, origin, pathname, params = {}) {
	expect(resource).not.toBeNull();

	const url = new URL(resource);
	expect(url.origin).toBe(origin);
	expect(url.pathname).toBe(pathname);

	for (const [key, value] of Object.entries(params)) {
		expect(url.searchParams.get(key)).toBe(value);
	}
}
