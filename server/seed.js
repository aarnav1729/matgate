/**
 * MatGate Seed Script
 * Reads the SAP Material Codes Excel file and inserts into MongoDB.
 * 
 * Usage: Place this file in the same directory as the Excel master file, then run:
 *   node seed.js
 * 
 * Or specify a custom path:
 *   node seed.js /path/to/Material_codes_list.xlsx
 */

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');

const MONGO_URI = 'mongodb+srv://aarnavsingh836:Cucumber1729@rr.oldse8x.mongodb.net/matgate?retryWrites=true&w=majority';

// Resolve the Excel file path
const defaultFile = path.join(__dirname, 'Material_codes_list_-_13_03_2026.xlsx');
const excelPath = process.argv[2] || defaultFile;

async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to matgate database');

  // Define the schema/model inline (matches models/Material.js)
  const materialSchema = new mongoose.Schema({
    materialCode: { type: String, required: true, unique: true, index: true },
    materialType: { type: String, required: true },
    baseUoM: { type: String, required: true },
    materialGroup: { type: String, default: '' },
    materialDescription: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  }, { timestamps: true });

  const Material = mongoose.models.Material || mongoose.model('Material', materialSchema);

  // Read Excel
  console.log(`📄 Reading Excel file: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`   Found ${rows.length} rows`);

  // Map rows to documents
  const docs = rows.map(row => ({
    materialCode: String(row['Material'] || '').trim(),
    materialType: String(row['Material Type'] || '').trim(),
    baseUoM: String(row['Base Unit of Measure'] || '').trim(),
    materialGroup: String(row['Material Group'] || '').trim(),
    materialDescription: String(row['Material Description'] || '').trim(),
    isActive: true
  })).filter(d => d.materialCode);

  console.log(`   Mapped ${docs.length} valid documents`);

  // Drop existing and bulk insert
  const existing = await Material.countDocuments();
  if (existing > 0) {
    console.log(`⚠️  Found ${existing} existing materials. Dropping collection...`);
    await Material.collection.drop().catch(() => {});
    // Recreate indexes
    await Material.createIndexes();
  }

  // Insert in batches of 5000
  const BATCH = 5000;
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    await Material.insertMany(batch, { ordered: false }).catch(e => {
      console.warn(`   Batch ${Math.floor(i / BATCH) + 1}: ${e.writeErrors?.length || 0} duplicates skipped`);
    });
    inserted += batch.length;
    console.log(`   Inserted ${inserted}/${docs.length}`);
  }

  console.log(`\n✅ Seed complete! ${docs.length} materials imported to matgate.materials`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
