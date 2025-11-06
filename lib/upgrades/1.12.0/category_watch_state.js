'use strict';

const db = require('../../database');
const batch = require('../../batch');
const categories = require('../../categories');
module.exports = {
	name: 'Update category watch data',
	timestamp: Date.UTC(2018, 11, 13),
	method: async function () {
		const {
			progress,
		} = this;
		const cids = await db.getSortedSetRange('categories:cid', 0, -1);
		const keys = cids.map(cid => `cid:${cid}:ignorers`);
		await batch.processSortedSet('users:joindate', async (uids) => {
			progress.incr(uids.length);
			const categoryPromises = cids.map(async (cid) => {
				const isMembers = await db.isSortedSetMembers(`cid:${cid}:ignorers`, uids);
				const filteredUids = uids.filter((uid, index) => isMembers[index]);
				if (filteredUids.length) {
					const states = filteredUids.map(() => categories.watchStates.ignoring);
					await db.sortedSetAdd(`cid:${cid}:uid:watch:state`, states, filteredUids);
				}
			});
			await Promise.all(categoryPromises);
		}, {
			progress: progress,
			batch: 500,
		});
		await db.deleteAll(keys);
	},
};