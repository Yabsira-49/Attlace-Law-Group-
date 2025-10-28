const bcrypt = require('bcryptjs');

// Replace with your desired password
const password = 'Yabsira49@';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);
console.log('Generated Hash:', hash);
console.log('\nCopy this hash for your database:');
console.log(hash);