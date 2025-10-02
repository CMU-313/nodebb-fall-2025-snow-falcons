'use strict';

const path = require('path');
const nconf = require('nconf');

// Set up nconf first (NodeBB's configuration system)
nconf.argv().env({ separator: '__' });
nconf.file({ file: path.join(__dirname, '..', 'config.json') });
nconf.defaults({
	base_dir: path.join(__dirname, '..'),
	themes_path: path.join(__dirname, '..', 'node_modules'),
	views_dir: path.join(__dirname, '..', 'build/public/templates'),
	upload_path: 'public/uploads',
});

// Set NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Require the database module to initialize the connection
const db = require('../src/database');

(async () => {
	try {
		console.log('🔌 Initializing database connection...');
		
		// Initialize the database connection
		await db.init();
		console.log('✅ Database connected');

		// Now require user modules after DB is initialized
		const user = require('../src/user');
		const privileges = require('../src/privileges');

		console.log('🚀 Testing role assignment...');

		// Replace with real UIDs from your DB
		const adminUid = 1;   // must be an admin user
		const targetUid = 2;  // normal user to tag
		const role = 'TA';

		// Check if admin user is actually an admin
		const isAdmin = await privileges.users.isAdministrator(adminUid);
		console.log(`👤 User ${adminUid} is admin:`, isAdmin);

		if (!isAdmin) {
			console.error('❌ User is not an admin!');
			process.exit(1);
		}

		// Check if target user exists
		const userExists = await user.exists(targetUid);
		console.log(`👤 Target user ${targetUid} exists:`, userExists);

		if (!userExists) {
			console.error('❌ Target user does not exist!');
			process.exit(1);
		}

		// Check if target is admin/global mod
		const [isTargetAdmin, isTargetGlobalMod] = await Promise.all([
			privileges.users.isAdministrator(targetUid),
			privileges.users.isGlobalModerator(targetUid),
		]);

		if (isTargetAdmin || isTargetGlobalMod) {
			console.error('❌ Cannot assign role to admin/global mod!');
			process.exit(1);
		}

		// Assign the role directly
		await user.setUserField(targetUid, 'userRole', role);
		console.log(`✅ Successfully assigned role "${role}" to user ${targetUid}`);

		// Verify the assignment
		const assignedRole = await user.getUserField(targetUid, 'userRole');
		console.log(`✅ Verified: User ${targetUid} now has role: "${assignedRole}"`);

		console.log('🎉 Test completed successfully!');
		
		// Close database connection
		await db.close();
		process.exit(0);
	} catch (err) {
		console.error('❌ Test failed:', err);
		console.error(err.stack);
		process.exit(1);
	}
})();