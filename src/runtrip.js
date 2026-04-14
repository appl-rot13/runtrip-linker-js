import * as twitter from "./twitter.js";
import * as utils from "./utils.js";

export async function getLatestJournalId(env, userId) {
	const journalId = await env.KV.get(`${userId}:JournalID`);
	if (journalId) {
		return journalId;
	}

	const journal = await getLatestJournal(env, userId);
	await setLatestJournalId(env, userId, journal.id);

	return journal.id;
}

export async function setLatestJournalId(env, userId, journalId) {
	await env.KV.put(`${userId}:JournalID`, journalId);
}

export async function getLatestJournal(env, userId) {
	const journals = await getJournals(env, userId);
	return journals[0].journal;
}

export async function* getNewJournals(env, userId, journalId) {
	const journals = await getJournals(env, userId, true);

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

export async function getJournals(env, userId, useCache = false) {
	const response = await fetch(`https://runtrip.jp/users/${userId}`);
	const html = await response.text();

	const json = utils.substringBetween(html, '<script id="__NEXT_DATA__" type="application/json">', '</script>');
	const hash = await utils.sha1(json);
	if (useCache) {
		const prevHash = await env.KV.get(`${userId}:Hash`);
		if (hash === prevHash) {
			return [];
		}
	}

	await env.KV.put(`${userId}:Hash`, hash);
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
