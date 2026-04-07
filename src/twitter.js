import { createHmac } from "node:crypto";

import OAuth from "oauth-1.0a";
import twitterText from "twitter-text";

import * as utils from "./utils.js";

const MAX_TWEET_LENGTH = 280;

export function sanitizeHashtag(hashtag) {
	const letters = "\\p{L}\\p{M}";
	const numerals = "\\p{Nd}";
	const specialChars =
		"\\u005F\\u200C\\u200D\\uA67E\\u05BE\\u05F3\\u05F4\\uFF5E" +
		"\\u301C\\u309B\\u309C\\u30A0\\u30FB\\u3003\\u0F0B\\u0F0C\\u00B7";

	hashtag = hashtag.replace(new RegExp(`[^${letters}${numerals}${specialChars}]`, "gu"), "");
	if (!new RegExp(`[${letters}]`, "u").test(hashtag)) {
		return "";
	}

	return "#" + hashtag;
}

export function sanitizeTweetText(text) {
	const invalidChars = /[\uFFFE\uFEFF\uFFFF]/g;
	return text.replace(invalidChars, "");
}

export function limitTweetText(text, { ellipsis = "…", prefix = "", suffix = "" } = {}) {
	const tweetText = sanitizeTweetText(prefix + text + suffix);

	const result = twitterText.parseTweet(tweetText);
	if (result.valid) {
		return tweetText;
	}

	const trimLength = Math.floor((MAX_TWEET_LENGTH - result.weightedLength) / 2) - [...ellipsis].length;
	const trimmedText = [...text].slice(0, trimLength).join("");
	if (!trimmedText) {
		return "";
	}

	return limitTweetText(trimmedText + ellipsis, { ellipsis, prefix, suffix });
}

export async function tweet(env, text, imageUrl = null) {
	const oauth = new OAuth({
		consumer: {
			key: env.TWITTER_API_KEY,
			secret: env.TWITTER_API_KEY_SECRET,
		},
		signature_method: "HMAC-SHA1",
		hash_function(base_string, key) {
			return createHmac("sha1", key).update(base_string).digest("base64");
		},
	});

	const oauthToken = {
		key: env.TWITTER_ACCESS_TOKEN,
		secret: env.TWITTER_ACCESS_TOKEN_SECRET,
	};

	let mediaId = null;
	if (imageUrl) {
		const media = await uploadRequest(oauth, oauthToken, imageUrl);
		if (!media.data?.id) {
			return media;
		}

		mediaId = media.data.id;
	}

	return await tweetRequest(oauth, oauthToken, text, mediaId);
}

async function tweetRequest(oauth, oauthToken, text, mediaId = null) {
	const body = { text: text };

	if (mediaId) {
		body.media = { media_ids: [mediaId] };
	}

	return await apiRequest(oauth, oauthToken, "tweets", body);
}

async function uploadRequest(oauth, oauthToken, imageUrl) {
	const body = {
		media: await utils.fetchImageAsBase64(imageUrl),
		media_category: "tweet_image",
	};

	return await apiRequest(oauth, oauthToken, "media/upload", body);
}

async function apiRequest(oauth, oauthToken, endpoint, body) {
	const request = {
		url: `https://api.x.com/2/${endpoint}`,
		method: "POST",
	};

	const response = await fetch(request.url, {
		method: request.method,
		headers: {
			...oauth.toHeader(oauth.authorize(request, oauthToken)),
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	return response.json();
}
