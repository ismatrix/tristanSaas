const mongoose = require('mongoose');

async function checkDistinctCountries() {
  await mongoose.connect('mongodb://127.0.0.1:27017/node-boilerplate');
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  const collection = db.collection('keyGlobalFamilyTree');
  const countries = await collection.distinct('registeredCountry');
  const regions = await collection.distinct('cmiRegion');
  const cities = await collection.distinct('registeredCity');

  console.log('--- distinct registeredCountry count:', countries.length);
  console.log('Countries sample:', countries.slice(0, 30));
  console.log('Includes Malaysia?', countries.includes('Malaysia'));
  console.log('Includes Malaysia (case insensitive)?', countries.some(c => c && c.toLowerCase().includes('malaysia')));
  
  console.log('--- distinct cmiRegion count:', regions.length);
  console.log('Regions:', regions);

  console.log('--- distinct registeredCity count:', cities.length);
  console.log('Cities count:', cities.length);

  await mongoose.disconnect();
}

checkDistinctCountries().catch(console.error);
