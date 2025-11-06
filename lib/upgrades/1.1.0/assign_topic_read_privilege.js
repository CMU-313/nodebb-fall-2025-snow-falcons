'use strict';

const winston = require('winston');
const db = require('../../database');
module.exports = {
	name: 'Giving topics:read privs to any group/user that was previously allowed to Find & Access Category',
	timestamp: Date.UTC(2016, 4, 28),
	method: async function () {
		const groupsAPI = require('../../groups');
		const privilegesAPI = require('../../privileges');
		const cids = await db.getSortedSetRange('categories:cid', 0, -1);
		const categoryPromises = cids.map(async (cid) => {
			const {
				groups,
				users,
			} = await privilegesAPI.categories.list(cid);
			const groupPromises = groups.map(async (group) => {
				if (group.privileges['groups:read']) {
					await groupsAPI.join(`cid:${cid}:privileges:groups:topics:read`, group.name);
					winston.verbose(`cid:${cid}:privileges:groups:topics:read granted to gid: ${group.name}`);
				}
			});
			await Promise.all(groupPromises);
			const userPromises = users.map(async (user) => {
				if (user.privileges.read) {
					await groupsAPI.join(`cid:${cid}:privileges:topics:read`, user.uid);
					winston.verbose(`cid:${cid}:privileges:topics:read granted to uid: ${user.uid}`);
				}
			});
			await Promise.all(userPromises);
			winston.verbose(`-- cid ${cid} upgraded`);
		});
		await Promise.all(categoryPromises);
	},
};