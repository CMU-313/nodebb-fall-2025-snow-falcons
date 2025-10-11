// scripts/setupUserRole.js
'use strict';

const db = require('../src/database');
const user = require('../src/user');

(async () => {
	const field = {
		key: 'userRole',
		name: 'User Role',
		type: 'select',
		'select-options': 'Student\nTA',
		visibility: 'privileged',
	};

	await db.sortedSetAdd('user-custom-fields', 0, 'userRole');
	await db.setObject('user-custom-field:userRole', field);

	await user.reloadCustomFieldWhitelist();

	console.log('Custom field userRole created.');
	process.exit(0);
})();