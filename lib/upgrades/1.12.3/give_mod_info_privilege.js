'use strict';

const db = require('../../database');
const privileges = require('../../privileges');
const groups = require('../../groups');
module.exports = {
	name: 'give mod info privilege',
	timestamp: Date.UTC(2019, 9, 8),
	method: async function () {
		const cids = await db.getSortedSetRevRange('categories:cid', 0, -1);
		const categoryPromises = cids.map(async (cid) => {
			await givePrivsToModerators(cid, '');
			await givePrivsToModerators(cid, 'groups:');
		});
		await Promise.all(categoryPromises);
		await privileges.global.give(['groups:view:users:info'], 'Global Moderators');
		async function givePrivsToModerators(cid, groupPrefix) {
			const members = await db.getSortedSetRevRange(`group:cid:${cid}:privileges:${groupPrefix}moderate:members`, 0, -1);
			const memberPromises = members.map(member => groups.join(['cid:0:privileges:view:users:info'], member));
			await Promise.all(memberPromises);
		}
	},
};