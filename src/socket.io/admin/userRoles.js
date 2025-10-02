'use strict';

const user = require('../../user');
const privileges = require('../../privileges');

const UserRoles = {};

UserRoles.assignRole = async function (socket, { uid, role }) {
	const isAdmin = await privileges.users.isAdministrator(socket.uid);
	if (!isAdmin) {
		throw new Error('[[error:no-privileges]]');
	}

	const validRoles = ['', 'Student', 'TA'];
	if (!validRoles.includes(role)) {
		throw new Error('[[error:invalid-role]]');
	}

	const [isTargetAdmin, isTargetGlobalMod] = await Promise.all([
		privileges.users.isAdministrator(uid),
		privileges.users.isGlobalModerator(uid),
	]);
	if (isTargetAdmin || isTargetGlobalMod) {
		throw new Error('[[error:cant-assign-role-to-admin]]');
	}

	await user.setUserField(uid, 'userRole', role);
	return { success: true };
};

module.exports = UserRoles;