# Property Listing Error - Debugging Guide

## Current Status
Enhanced error logging has been added to identify the exact cause of the "Failed to create property" error.

## Changes Made

### 1. Property Number Generation (`backend/src/tables/property.js`)
- ✅ Fixed to use `mongoose.model('Property')` instead of `this.constructor`
- ✅ Added error handling in uniqueness check
- ✅ Added console logs for successful generation and fallback usage
- ✅ Prevents silent failures

### 2. Property Creation Endpoint (`backend/src/routes/properties.js`)
- ✅ Enhanced Cloudinary upload logging
- ✅ Added full payload logging before database save
- ✅ Improved error response with field-level details
- ✅ Handles empty/invalid rooms data
- ✅ Logs stack traces and validation errors

### 3. Frontend Error Display (`frontend/src/pages/UploadProperty.jsx`)
- ✅ Logs form data before submission
- ✅ Logs backend response
- ✅ Shows detailed error messages with field names
- ✅ Extended toast duration to 5 seconds

## How to Debug

### Step 1: Deploy Changes to Render
```bash
git add .
git commit -m "Add comprehensive error logging for property creation"
git push origin main
```

Wait for Render to deploy (check deployment status on Render dashboard).

### Step 2: Try Creating a Property
1. Go to your deployed app
2. Login as a property owner
3. Navigate to "List your property"
4. Fill in the form:
   - Title: "Test Property"
   - Address: "123 Test St"
   - City: "Kigali"
   - Price per night: 50000
   - Upload at least one image
5. Click "Create Listing"

### Step 3: Check Browser Console
Open browser DevTools (F12) and look for:

```javascript
// What's being sent
Submitting property with data: {
  title: "Test Property",
  address: "123 Test St",
  city: "Kigali",
  pricePerNight: "50000",
  commissionRate: 8,
  bedrooms: "1",
  bathrooms: "1",
  filesCount: 1
}

// Backend response
Backend response: { ... }
```

### Step 4: Check Render Logs
Go to Render dashboard → Your backend service → Logs

Look for these log entries:

#### Success Case:
```
Uploading 1 images to Cloudinary...
Successfully uploaded 1 images
Creating property with payload: { title, address, city, ... }
Full payload: { ... }
Generated unique property number: A1B2C3D4E5
Property created successfully: 507f1f77bcf86cd799439011
```

#### Error Case - Will show one of these:
```
// Authentication error
POST /api/properties 401 Unauthorized

// Validation error
Property creation error: Property validation failed: ...
Validation errors: { field: 'pricePerNight', message: 'Path `pricePerNight` is required.' }

// Property number error
Error generating property number: ...

// Cloudinary error
Cloudinary upload failed: ...

// MongoDB connection error
MongoError: ...
```

## Common Errors and Solutions

### Error 1: "Property validation failed: pricePerNight: Path `pricePerNight` is required"
**Cause:** Price is not being sent or is invalid
**Solution:** Check that pricePerNight is a valid number in the form

### Error 2: "Property validation failed: host: Path `host` is required"
**Cause:** User is not authenticated or token is invalid
**Solution:** 
- Check that user is logged in
- Verify JWT_SECRET matches between frontend and backend
- Check cookie settings (secure, sameSite)

### Error 3: "E11000 duplicate key error collection: akwandadb.properties index: propertyNumber_1"
**Cause:** Property number collision (very rare)
**Solution:** The fallback mechanism should handle this, but if it persists:
- Check MongoDB index on propertyNumber
- Verify property number generation is working

### Error 4: "Cloudinary upload failed: ..."
**Cause:** Cloudinary credentials not set or invalid
**Solution:**
- Verify environment variables on Render:
  - CLOUDINARY_CLOUD_NAME
  - CLOUDINARY_API_KEY
  - CLOUDINARY_API_SECRET
- Note: Property creation should still succeed even if image upload fails

### Error 5: "Invalid token" or "Unauthorized"
**Cause:** Authentication issue
**Solution:**
- Check that cookies are being sent with credentials: 'include'
- Verify CORS settings allow credentials
- Check that CLIENT_URL on Render matches your Vercel URL

## Environment Variables Checklist

Verify these are set on Render:

```env
# Required
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
CLIENT_URL=https://your-app.vercel.app

# Cloudinary (optional - property can be created without images)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS (if multiple domains)
CORS_ORIGINS=https://your-app.vercel.app,https://your-preview.vercel.app
```

## What to Share for Further Help

If the error persists after deploying these changes, please share:

1. **Browser Console Output:**
   - Screenshot or copy the "Submitting property with data:" log
   - Screenshot or copy the "Backend response:" log
   - Any error messages in red

2. **Render Backend Logs:**
   - Copy the logs from when you tried to create the property
   - Include at least 50 lines before and after the error
   - Look for "Creating property with payload:" and "Full payload:"

3. **Form Data:**
   - What values did you enter in the form?
   - Did you upload images?
   - What commission rate did you select?

4. **Environment:**
   - Are you logged in as a property owner?
   - What's your Vercel URL?
   - What's your Render backend URL?

## Quick Test Commands

### Test Backend Health:
```bash
curl https://your-backend.onrender.com/health
```

### Test Authentication:
```bash
# Login first to get token, then:
curl -X POST https://your-backend.onrender.com/api/properties \
  -H "Cookie: akw_token=YOUR_TOKEN" \
  -F "title=Test" \
  -F "address=123 St" \
  -F "city=Kigali" \
  -F "pricePerNight=50000"
```

## Next Steps

1. Deploy the changes
2. Try creating a property
3. Check browser console and Render logs
4. Share the logs if error persists
5. I'll provide a targeted fix based on the exact error
