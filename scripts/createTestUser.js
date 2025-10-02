'use strict';

const path = require('path');
const nconf = require('nconf');

// Load NodeBB config
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

// Init DB
const db = require('../src/database');

(async () => {
  try {
    console.log('🔌 Connecting to DB...');
    await db.init();

    const user = require('../src/user');

    // Create the new user
    const newUser = {
      username: 'student1',
      password: 'password123',       // plaintext here, NodeBB will hash internally
      email: 'student1@example.com',
    };

    const uid = await user.create(newUser);
    console.log(`✅ Created new user "${newUser.username}" with UID: ${uid}`);

    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create user:', err);
    process.exit(1);
  }
})();
