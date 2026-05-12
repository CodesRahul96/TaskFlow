const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  const res = await User.updateOne({ email: 'codesrahul96@gmail.com' }, { mfaEnabled: false, mfaSecret: undefined });
  console.log('Update result:', res);
  await mongoose.disconnect();
}

run().catch(console.error);
