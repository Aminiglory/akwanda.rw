const mongoose = require('mongoose');
const Property = require('../src/tables/property');

// Generate property number with 5 numbers and 5 capital letters (10 chars total)
function generateNewPropertyNumber() {
  const numbers = '0123456789';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  
  // Add 5 random numbers
  for (let i = 0; i < 5; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  // Add 5 random capital letters
  for (let i = 0; i < 5; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // Shuffle the result to mix numbers and letters
  return result.split('').sort(() => Math.random() - 0.5).join('');
}

// Check if property number already exists
async function isPropertyNumberUnique(propertyNumber, excludeId = null) {
  const query = { propertyNumber };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Property.findOne(query).select('_id').lean();
  return !existing;
}

// Generate unique property number
async function generateUniquePropertyNumber(excludeId = null) {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const propertyNumber = generateNewPropertyNumber();
    if (await isPropertyNumberUnique(propertyNumber, excludeId)) {
      return propertyNumber;
    }
    attempts++;
  }
  
  // Fallback with timestamp if all attempts fail
  const timestamp = Date.now().toString().slice(-4);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let fallback = timestamp;
  for (let i = 0; i < 6; i++) {
    fallback += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return fallback;
}

async function migratePropertyNumbers() {
  try {
    console.log('🔄 Starting property number migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/akwanda');
    console.log('✅ Connected to MongoDB');
    
    // Find all properties
    const properties = await Property.find({}).select('_id title propertyNumber').lean();
    console.log(`📊 Found ${properties.length} properties`);
    
    let migrated = 0;
    let updated = 0;
    let errors = 0;
    
    for (const property of properties) {
      try {
        let needsUpdate = false;
        let newPropertyNumber = property.propertyNumber;
        
        // Check if property has no property number
        if (!property.propertyNumber) {
          newPropertyNumber = await generateUniquePropertyNumber();
          needsUpdate = true;
          migrated++;
          console.log(`➕ Generated new property number for "${property.title}": ${newPropertyNumber}`);
        }
        // Check if property number doesn't match new format (10 chars, 5 numbers + 5 letters)
        else if (property.propertyNumber.length !== 10 || 
                 !/^(?=.*[0-9].*[0-9].*[0-9].*[0-9].*[0-9])(?=.*[A-Z].*[A-Z].*[A-Z].*[A-Z].*[A-Z])[A-Z0-9]{10}$/.test(property.propertyNumber)) {
          newPropertyNumber = await generateUniquePropertyNumber(property._id);
          needsUpdate = true;
          updated++;
          console.log(`🔄 Updated property number for "${property.title}": ${property.propertyNumber} → ${newPropertyNumber}`);
        }
        
        // Update the property if needed
        if (needsUpdate) {
          await Property.updateOne(
            { _id: property._id },
            { $set: { propertyNumber: newPropertyNumber } }
          );
        }
        
      } catch (error) {
        console.error(`❌ Error processing property "${property.title}":`, error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Properties processed: ${properties.length}`);
    console.log(`➕ New property numbers generated: ${migrated}`);
    console.log(`🔄 Property numbers updated to new format: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`✨ Total changes: ${migrated + updated}`);
    
    if (migrated + updated > 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n✅ All properties already have valid property numbers.');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePropertyNumbers();
}

module.exports = { migratePropertyNumbers, generateUniquePropertyNumber };
