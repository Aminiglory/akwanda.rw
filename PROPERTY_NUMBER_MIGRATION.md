# Property Number Migration Guide

## Overview
This guide explains how to handle existing properties that don't have property numbers or have the old format property numbers.

## New Property Number Format
- **Length**: Exactly 10 characters
- **Composition**: 5 random numbers (0-9) + 5 random capital letters (A-Z)
- **Pattern**: Mixed/shuffled (e.g., `A7B2K9M3L5`, `9K2L7A4M1B`)
- **Uniqueness**: Guaranteed unique across all properties

## Migration Strategy

### 1. Automatic Backend Generation
The backend now automatically generates property numbers for:
- **New properties**: Generated during property creation
- **Existing properties without property numbers**: Generated when accessed/updated
- **Properties with old format**: Can be migrated using the migration script

### 2. Migration Script
A dedicated migration script handles existing properties:

```bash
# Navigate to backend directory
cd backend

# Run the migration script
npm run migrate:property-numbers
```

### 3. What the Migration Does

#### For Properties WITHOUT Property Numbers:
- ✅ Generates new 10-character property number
- ✅ Updates database record
- ✅ Logs the new property number

#### For Properties WITH Old Format Property Numbers:
- 🔄 Detects old format (e.g., `PR-AB12CD`)
- 🔄 Generates new 10-character property number
- 🔄 Updates database record
- 🔄 Logs the change (old → new)

#### For Properties WITH New Format Property Numbers:
- ✅ Skips (no action needed)
- ✅ Validates format is correct

## Migration Output Example

```
🔄 Starting property number migration...
✅ Connected to MongoDB
📊 Found 25 properties

➕ Generated new property number for "Cozy Downtown Apartment": K7M2A9L4B3
🔄 Updated property number for "Luxury Villa": PR-AB12CD → 3L8K2M7A1B
✅ Property "Modern Hotel Suite" already has valid property number: 9A4K7L2M8B

📈 Migration Summary:
✅ Properties processed: 25
➕ New property numbers generated: 8
🔄 Property numbers updated to new format: 12
❌ Errors: 0
✨ Total changes: 20

🎉 Migration completed successfully!
```

## Frontend Integration

### Registration Form
- New properties automatically get property numbers during registration
- Property number is displayed as read-only field
- Users can regenerate property numbers if desired

### Existing Property Management
- Property owners can view their property numbers in dashboards
- Property numbers are displayed in property listings
- Property numbers are used for booking references

## Database Schema Updates

### Property Schema
```javascript
propertyNumber: { 
  type: String, 
  unique: true, 
  index: true 
}
```

### Middleware
- **Pre-save**: Generates property number if missing
- **Pre-insertMany**: Handles bulk operations
- **Uniqueness**: Ensures no duplicates

## API Endpoints

### Property Creation
```javascript
POST /api/properties
// Automatically generates propertyNumber if not provided
```

### Property Updates
```javascript
PUT /api/properties/:id
// Preserves existing propertyNumber, generates if missing
```

### Property Listing
```javascript
GET /api/properties
// Returns properties with propertyNumber field
```

## Rollback Strategy

If rollback is needed:

1. **Backup Database**: Always backup before migration
2. **Restore from Backup**: Use MongoDB restore tools
3. **Manual Rollback**: Update specific records if needed

```javascript
// Example manual rollback for specific property
db.properties.updateOne(
  { _id: ObjectId("...") },
  { $set: { propertyNumber: "OLD_VALUE" } }
);
```

## Validation

### Backend Validation
- Property numbers must be exactly 10 characters
- Must contain 5 numbers and 5 letters
- Must be unique across all properties

### Frontend Validation
- Read-only field prevents manual editing
- Generation function ensures correct format
- Uniqueness checked during registration

## Monitoring

### Migration Logs
- All changes are logged with timestamps
- Success/failure status for each property
- Summary statistics at completion

### Database Queries
```javascript
// Check properties without property numbers
db.properties.find({ propertyNumber: { $exists: false } });

// Check properties with old format
db.properties.find({ 
  propertyNumber: { $regex: /^PR-/ } 
});

// Validate new format
db.properties.find({ 
  propertyNumber: { 
    $not: /^(?=.*[0-9].*[0-9].*[0-9].*[0-9].*[0-9])(?=.*[A-Z].*[A-Z].*[A-Z].*[A-Z].*[A-Z])[A-Z0-9]{10}$/ 
  } 
});
```

## Best Practices

1. **Run Migration During Low Traffic**: Minimize impact on users
2. **Backup First**: Always backup database before migration
3. **Test in Staging**: Run migration in staging environment first
4. **Monitor Logs**: Watch for errors during migration
5. **Verify Results**: Check property numbers after migration

## Troubleshooting

### Common Issues

#### Migration Fails to Connect
```bash
Error: MongoDB connection failed
```
**Solution**: Check MongoDB connection string and ensure database is running

#### Duplicate Property Numbers
```bash
Error: E11000 duplicate key error
```
**Solution**: Migration script handles this with retry logic and fallback generation

#### Invalid Format Detection
```bash
Property number doesn't match expected format
```
**Solution**: Migration script will regenerate invalid property numbers

### Support Commands

```bash
# Check migration status
node -e "
const mongoose = require('mongoose');
const Property = require('./src/tables/property');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const total = await Property.countDocuments();
  const withNumbers = await Property.countDocuments({ propertyNumber: { \$exists: true } });
  console.log(\`Total: \${total}, With Numbers: \${withNumbers}, Missing: \${total - withNumbers}\`);
  process.exit(0);
});
"

# Force regenerate all property numbers (use with caution)
node -e "
const mongoose = require('mongoose');
const Property = require('./src/tables/property');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Property.updateMany({}, { \$unset: { propertyNumber: 1 } });
  console.log('All property numbers cleared. They will be regenerated on next access.');
  process.exit(0);
});
"
```

## Conclusion

The property number migration ensures all properties have unique, consistent identifiers while maintaining backward compatibility and providing a smooth transition path for existing data.
