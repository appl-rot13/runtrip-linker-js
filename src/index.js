import * as runtrip from "./runtrip.js";

export default {
	async scheduled(event, env, ctx) {
		ctx.waitUntil(tweetNewJournals(env).catch(err => {
			console.error("Unhandled error:", err);
		}));
	},
};

async function tweetNewJournals(env)
{
	const userId = env.RUNTRIP_USER_ID;
	const journalId = await runtrip.getLatestJournalId(env, userId);

	const journals = await runtrip.getNewJournals(userId, journalId);
	for (const journal of journals) {
		console.log(await runtrip.tweetJournal(env, journal));
		await runtrip.setLatestJournalId(env, userId, journal.id);
	}
}
