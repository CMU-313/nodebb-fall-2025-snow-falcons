'use strict';
const user = require('../../user');
const privileges = require('../../privileges');
const db = require('../../database');
const UserRoles = {};
async function requireAdmin(socket) {
	const isAdmin = await privileges.users.isAdministrator(socket.uid);
	if (!isAdmin) throw new Error('[[error:no-privileges]]');
}
async function getRoles() {
	const userRoleField = await db.getObject('user-custom-field:userRole');
	return (userRoleField['select-options'] || 'Student\nTA').split('\n');
}
UserRoles.assignRole = async function (socket, { uid, role }) {
	await requireAdmin(socket);
	const validRoles = ['', ...await getRoles()];
	if (!validRoles.includes(role)) throw new Error('[[error:invalid-role]]');
	const [isTargetAdmin, isTargetGlobalMod] = await Promise.all([
		privileges.users.isAdministrator(uid),
		privileges.users.isGlobalModerator(uid),
	]);
	if (isTargetAdmin || isTargetGlobalMod) throw new Error('[[error:cant-assign-role-to-admin]]');
	await user.setUserField(uid, 'userRole', role);
	return { success: true };
};
UserRoles.getRoles = async function (socket) {
	await requireAdmin(socket);
	return { roles: await getRoles() };
};
UserRoles.createRole = async function (socket, { roleName }) {
	await requireAdmin(socket);
	if (!roleName?.trim()) throw new Error('[[error:invalid-role-name]]');
	const userRoleField = await db.getObject('user-custom-field:userRole');
	const currentRoles = (userRoleField['select-options'] || 'Student\nTA').split('\n');
	if (currentRoles.includes(roleName.trim())) throw new Error('[[error:role-already-exists]]');
	currentRoles.push(roleName.trim());
	userRoleField['select-options'] = currentRoles.join('\n');
	await db.setObject('user-custom-field:userRole', userRoleField);
	await user.reloadCustomFieldWhitelist();
	return { success: true, roles: currentRoles };
};
UserRoles.deleteRole = async function (socket, { roleName }) {
	await requireAdmin(socket);
	if (!roleName?.trim()) throw new Error('[[error:invalid-role-name]]');
	if (roleName.trim() === 'Student') throw new Error('[[error:cannot-delete-default-role]]');
	const userRoleField = await db.getObject('user-custom-field:userRole');
	const currentRoles = (userRoleField['select-options'] || 'Student\nTA').split('\n');
	if (!currentRoles.includes(roleName.trim())) throw new Error('[[error:role-not-found]]');
	const updatedRoles = currentRoles.filter(role => role !== roleName.trim());
	userRoleField['select-options'] = updatedRoles.join('\n');
	await db.setObject('user-custom-field:userRole', userRoleField);
	const allUids = await db.getSortedSetRange('users:joindate', 0, -1);
	let updatedUserCount = 0;
	for (const uid of allUids) {
		const userRole = await user.getUserField(uid, 'userRole');
		if (userRole === roleName.trim()) {
			const isUserAdmin = await privileges.users.isAdministrator(uid);
			await user.setUserField(uid, 'userRole', isUserAdmin ? 'Admin' : 'Student');
			updatedUserCount++;
		}
	}
	await user.reloadCustomFieldWhitelist();
	return { success: true, roles: updatedRoles, updatedUsers: updatedUserCount };
};
module.exports = UserRoles;