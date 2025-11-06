'use strict';

const groups = require('../../groups');
const db = require('../../database');
module.exports = {
	name: 'Give deleted post viewing privilege to moderators on all categories',
	timestamp: Date.UTC(2018, 5, 8),
	method: async function () {
		const {
			progress,
		} = this;
		const cids = await db.getSortedSetRange('categories:cid', 0, -1);
		const categoryPromises = cids.map(async (cid) => {
			const uids = await db.getSortedSetRange(`group:cid:${cid}:privileges:moderate:members`, 0, -1);
			const uidPromises = uids.map(uid => groups.join(`cid:${cid}:privileges:posts:view_deleted`, uid));
			await Promise.all(uidPromises);
			progress.incr();
		});
		await Promise.all(categoryPromises);
	},
};