// migrate-passwords.js
const fs = require('fs');
const bcrypt = require('bcryptjs');

async function migratePasswords() {
  try {
    const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    let changed = false;
    
    for (let user of users) {
      // If password is not bcrypt (doesn't start with $2a$ or $2b$)
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        // Decode base64 to get original password
        const plainPassword = Buffer.from(user.password, 'base64').toString('utf8');
        // Hash with bcrypt
        user.password = await bcrypt.hash(plainPassword, 10);
        changed = true;
        console.log(`Migrated user: ${user.email}`);
      }
    }
    
    if (changed) {
      fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
      console.log('✅ All passwords migrated to bcrypt successfully!');
    } else {
      console.log('✅ No passwords needed migration.');
    }
  } catch (error) {
    console.error('Error migrating passwords:', error);
  }
}

migratePasswords();