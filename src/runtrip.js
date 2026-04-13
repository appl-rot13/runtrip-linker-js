import * as twitter from "./twitter.js";
import * as utils from "./utils.js";

export async function getLatestJournalId(env, userId) {
	const journalId = await env.KV.get(userId);
	if (journalId) {
		return journalId;
	}

	const journal = await getLatestJournal(userId);
	await setLatestJournalId(env, userId, journal.id);

	return journal.id;
}

export async function setLatestJournalId(env, userId, journalId) {
	await env.KV.put(userId, journalId);
}

export async function getLatestJournal(userId) {
	const journals = await getJournals(userId);
	return journals[0].journal;
}

export async function* getNewJournals(env, userId, journalId) {
	const journals = await getJournalsWithCache(env, userId);

	let take = false;
	for (let i = journals.length - 1; i >= 0; i--) {
		const journal = journals[i].journal;

		if (take) {
			yield journal;
		}

		if (journal.id === journalId) {
			take = true;
		}
	}
}

export async function getJournals(userId) {
	const response = await fetchJournals(userId);
	return await extractJournals(userId, response);
}

export async function getJournalsWithCache(env, userId) {
	const prevEtag = await env.KV.get("ETag");
	const response = await fetchJournals(userId, prevEtag);

	if (response.status === 304) {
		return [];
	}

	const currEtag = response.headers.get("ETag");
	if (currEtag) {
		await env.KV.put("ETag", currEtag);
	}

	return await extractJournals(userId, response);
}

async function fetchJournals(userId, etag = null) {
	return await fetch(`https://runtrip.jp/users/${userId}`, {
		headers: {
			...(etag && { "If-None-Match": etag }),
		},
	});
}

async function extractJournals(userId, response) {
	const html = await response.text();
	const json = utils.substringBetween(html, '<script id="__NEXT_DATA__" type="application/json">', '</script>');
	const data = JSON.parse(json);

	const uri = `https://api.runtrip.jp/v1/users/${userId}/journals?pageNumber=0&pageSize=9:$get`;
	return data.props.pageProps.swr.fallback[uri].journals;
}

export function createTweetText(text, tags, url) {
	let suffix = "";
	if (tags) {
		suffix += "\n" + tags;
	}

	if (url) {
		suffix += "\n" + url;
	}

	return twitter.limitTweetText(text, { suffix });
}

export async function tweetJournal(env, journal) {
	const tags = journal.tags
		.map(twitter.sanitizeHashtag)
		.filter(Boolean)
		.join(" ");

	const journalUrl = `https://runtrip.jp/journals/${journal.id}`;
	const text = createTweetText(journal.description, tags, journalUrl);
	if (!text) {
		return null;
	}

	const imageUrl = journal.imageUrls[0];
	return await twitter.tweet(env, text, imageUrl);
}
