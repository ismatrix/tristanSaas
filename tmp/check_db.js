const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/node-boilerplate', { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  
  const keycustomers = await db.collection('keycustomer').find({}).limit(5).toArray();
  const industries = await db.collection('industry').find({}).limit(5).toArray();
  
  console.log('Keycustomers:', JSON.stringify(keycustomers, null, 2));
  console.log('Industries:', JSON.stringify(industries, null, 2));
  
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
