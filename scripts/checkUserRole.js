'use strict';

const db = require('../src/database');
const user = require('../src/user');

(async () => {
  const fields = await db.getSortedSetRange('user-custom-fields', 0, -1);
  console.log('Custom fields:', fields);

  const uid = 1; // replace with a test user UID
  const role = await user.getUserField(uid, 'userRole');
  console.log(`User ${uid} role:`, role);

  process.exit(0);
})();
