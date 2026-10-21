const fs = require('fs');
const mongoose = require('mongoose');

const envText = fs.readFileSync('.env', 'utf8');
let uri = '';
envText.split(/\r?\n/).forEach(line => {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.replace('MONGODB_URI=', '').trim();
    if (uri.startsWith('"') && uri.endsWith('"')) uri = uri.slice(1, -1);
    if (uri.startsWith("'") && uri.endsWith("'")) uri = uri.slice(1, -1);
  }
});

async function run() {
  console.log('Connecting to Mongo...');
  await mongoose.connect(uri);
  const users = await mongoose.connection.collection('users').find({}, { projection: { email: 1, role: 1, isAdmin: 1 } }).toArray();
  const vendors = await mongoose.connection.collection('vendors').find({}, { projection: { email: 1, name: 1, status: 1 } }).toArray();
  console.log('--- ALL USERS IN DB ---');
  console.log(users);
  console.log('--- ALL VENDORS IN DB ---');
  console.log(vendors);
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
