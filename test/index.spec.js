import { createExecutionContext, createScheduledController, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { createEnv, createJsonResponse, createImageResponse, expectUrl } from "./test-utils.js";

beforeEach(() => vi.spyOn(console, "log").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("scheduled", () => {
	describe("when no new journals are available", () => {
		it("sets the latest journal ID when no value is set in KV", async () => {
			const { env, fetchMock } = await runScheduledWorker();

			expect(await env.KV.get(env.RUNTRIP_USER_ID)).toBe(5);
			expect(env.KV.put).toHaveBeenCalledTimes(1);

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const { journalCalls } = groupCalls(fetchMock);
			expect(journalCalls).toHaveLength(1);
		});

		it("sets the latest journal ID when no journal is found for the KV value", async () => {
			const { env, fetchMock } = await runScheduledWorker(0);

			expect(await env.KV.get(env.RUNTRIP_USER_ID)).toBe(5);
			expect(env.KV.put).toHaveBeenCalledTimes(1);

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const { journalCalls } = groupCalls(fetchMock);
			expect(journalCalls).toHaveLength(1);
		});

		it("skips updating when the KV value is already the latest", async () => {
			const { env, fetchMock } = await runScheduledWorker(5);

			expect(await env.KV.get(env.RUNTRIP_USER_ID)).toBe(5);
			expect(env.KV.put).not.toHaveBeenCalled();

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const { journalCalls } = groupCalls(fetchMock);
			expect(journalCalls).toHaveLength(1);
		});
	});

	describe("when new journals should be posted", () => {
		it.each([
			{ n: 1 },
			{ n: 2 },
			{ n: 3 },
		])("posts $n new journals", async ({ n }) => {
			const { env, fetchMock } = await runScheduledWorker(5 - n);

			expect(await env.KV.get(env.RUNTRIP_USER_ID)).toBe(5);
			expect(env.KV.put).toHaveBeenCalledTimes(n);

			const { journalCalls, imageCalls, uploadCalls, tweetCalls } = groupCalls(fetchMock);
			expect(journalCalls).toHaveLength(1);

			const [journalUrl] = journalCalls[0];
			expectUrl(journalUrl, "https://runtrip.jp", "/users/1000");

			expect(imageCalls).toHaveLength(n);
			expect(uploadCalls).toHaveLength(n);
			expect(tweetCalls).toHaveLength(n);

			for (let i = 0; i < n; i++) {
				const id = 5 - n + i + 1;

				const [imageUrl] = imageCalls[i];
				expectUrl(imageUrl, "https://example.com", `/image${id}-0.jpg`);

				const [uploadUrl, uploadRequest] = uploadCalls[i];
				expectUrl(uploadUrl, "https://api.x.com", "/2/media/upload");

				expect(uploadRequest.method).toBe("POST");
				expect(uploadRequest.headers.Authorization).toContain("OAuth");
				expect(JSON.parse(uploadRequest.body)).toEqual({
					media: "AQIDBA==",
					media_category: "tweet_image",
				});

				const [tweetUrl, tweetRequest] = tweetCalls[i];
				expectUrl(tweetUrl, "https://api.x.com", "/2/tweets");

				expect(tweetRequest.method).toBe("POST");
				expect(tweetRequest.headers.Authorization).toContain("OAuth");
				expect(JSON.parse(tweetRequest.body)).toEqual({
					text: `description${id}` + `\nhttps://runtrip.jp/journals/${id}`,
					media: { media_ids: ["media_id"] },
				});
			}
		});
	});

	describe("when formatting the posted text", () => {
		it.each([
			{
				case: "omits the hashtag line when the journal has no tags",
				journal: createJournal(5),
				expected: "description5" + "\nhttps://runtrip.jp/journals/5",
			},
			{
				case: "includes a single tag",
				journal: createJournal(5, { tags: ["tag1"] }),
				expected: "description5" + "\n#tag1" + "\nhttps://runtrip.jp/journals/5",
			},
			{
				case: "includes multiple tags",
				journal: createJournal(5, { tags: ["tag1", "tag2"] }),
				expected: "description5" + "\n#tag1 #tag2" + "\nhttps://runtrip.jp/journals/5",
			},
			{
				case: "omits invalid tags",
				journal: createJournal(5, { tags: ["tag1", "0002", "tag3"] }),
				expected: "description5" + "\n#tag1 #tag3" + "\nhttps://runtrip.jp/journals/5",
			},
			{
				case: "shortens the description when the text exceeds the length limit",
				journal: createJournal(5, { description: "a".repeat(280) }),
				expected: "a".repeat(280 - 26) + "…" + "\nhttps://runtrip.jp/journals/5",
				// 26文字 = 省略記号(2文字) + URL(23文字) + 改行(1文字)
			},
		])("$case", async ({ journal, expected }) => {
			const { env, fetchMock } = await runScheduledWorker(4, {
				journals: (userId) =>
					createJournalPageResponse(userId, {
						journals: [journal, createJournal(4)],
					}),
			});

			expect(await env.KV.get(env.RUNTRIP_USER_ID)).toBe(5);
			expect(env.KV.put).toHaveBeenCalledTimes(1);

			const { journalCalls, imageCalls, uploadCalls, tweetCalls } = groupCalls(fetchMock);
			expect(journalCalls).toHaveLength(1);
			expect(imageCalls).toHaveLength(1);
			expect(uploadCalls).toHaveLength(1);
			expect(tweetCalls).toHaveLength(1);

			const [tweetUrl, tweetRequest] = tweetCalls[0];
			expectUrl(tweetUrl, "https://api.x.com", "/2/tweets");

			expect(JSON.parse(tweetRequest.body)).toEqual({
				text: expected,
				media: { media_ids: ["media_id"] },
			});
		});
	});

	describe("when posting should be skipped", () => {
		it("skips posting when the media upload fails", async () => {
			const { env, fetchMock } = await runScheduledWorker(4, {
				// TODO: 実際のエラー応答が分かれば差し替える
				upload: () => createJsonResponse({ errors: [] }),
			});

			expect(await env.KV.get(env.RUNTRIP_USER_ID)).toBe(5);
			expect(env.KV.put).toHaveBeenCalledTimes(1);

			const { journalCalls, imageCalls, uploadCalls, tweetCalls } = groupCalls(fetchMock);
			expect(journalCalls).toHaveLength(1);
			expect(imageCalls).toHaveLength(1);
			expect(uploadCalls).toHaveLength(1);
			expect(tweetCalls).toHaveLength(0);
		});

		it("skips posting when the text cannot be shortened", async () => {
			const tag = "a".repeat(280 - 28);
			// 28文字 = 省略記号(2文字) + ハッシュタグ(1文字) + URL(23文字) + 改行(1文字) * 2

			const { env, fetchMock } = await runScheduledWorker(4, {
				journals: (userId) =>
					createJournalPageResponse(userId, {
						journals: [createJournal(5, { tags: [tag] }), createJournal(4)],
					}),
			});

			expect(await env.KV.get(env.RUNTRIP_USER_ID)).toBe(5);
			expect(env.KV.put).toHaveBeenCalledTimes(1);

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const { journalCalls } = groupCalls(fetchMock);
			expect(journalCalls).toHaveLength(1);
		});
	});
});

async function runScheduledWorker(
	initialJournalId,
	{ tweets, upload, image, journals } = {},
) {
	const env = createEnv(initialJournalId);
	const ctx = createExecutionContext();
	const controller = createScheduledController();

	const fetchMock = vi.spyOn(global, "fetch")
		.mockImplementation((url, options) => {
			switch (true) {
				case url.includes("/2/tweets"):
					return tweets?.() ?? createJsonResponse({ data: { id: "", text: "" } });
				case url.includes("/2/media/upload"):
					return upload?.() ?? createJsonResponse({ data: { id: "media_id" } });
				case url.endsWith(".jpg"):
					return image?.() ?? createImageResponse([1, 2, 3, 4]);
				default:
					const userId = env.RUNTRIP_USER_ID;
					return journals?.(userId) ?? createJournalPageResponse(userId);
			}
		});

	await worker.scheduled(controller, env, ctx);
	await waitOnExecutionContext(ctx);

	return { env, fetchMock };
}

function groupCalls(fetchMock) {
	const tweetCalls = [];
	const uploadCalls = [];
	const imageCalls = [];
	const journalCalls = [];

	for (const call of fetchMock.mock.calls) {
		const [url] = call;
		switch (true) {
			case url.includes("/2/tweets"):
				tweetCalls.push(call);
				break;
			case url.includes("/2/media/upload"):
				uploadCalls.push(call);
				break;
			case url.endsWith(".jpg"):
				imageCalls.push(call);
				break;
			default:
				journalCalls.push(call);
				break;
		}
	}

	return { tweetCalls, uploadCalls, imageCalls, journalCalls };
}

function createJournalPageResponse(userId, journals) {
	const uri = `https://api.runtrip.jp/v1/users/${userId}/journals?pageNumber=0&pageSize=9:$get`;
	const json = JSON.stringify({
		props: {
			pageProps: {
				swr: {
					fallback: {
						[uri]: journals ?? createJournals(),
					},
				},
			},
		},
	});

	const script = `<script id="__NEXT_DATA__" type="application/json">${json}</script>`;
	const html = `<html><head></head><body>${script}</body></html>`;
	return new Response(html);
}

function createJournals() {
	return {
		journals: [
			createJournal(5, {
				imageUrls: [
					createImageUrl(5, 0),
					createImageUrl(5, 1),
					createImageUrl(5, 2),
				],
			}),
			createJournal(4),
			createJournal(3),
			createJournal(2),
			createJournal(1),
		],
	};
}

function createJournal(
	id,
	{
		description = `description${id}`,
		tags = [],
		imageUrls = [createImageUrl(id, 0)],
	} = {},
) {
	return {
		journal: { id, description, tags, imageUrls },
	};
}

function createImageUrl(id, index) {
	return `https://example.com/image${id}-${index}.jpg`;
}
