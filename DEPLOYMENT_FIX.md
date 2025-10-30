# Deployment Fix for Render.com

## 🔴 Error: "Exited with status 1 while running your code"

This error means the backend server crashed during startup. Here's how to fix it:

## ✅ Step 1: Commit All New Files

Make sure these files are committed to git:

```bash
git add backend/src/tables/deal.js
git add backend/src/routes/deals.js
git add backend/src/routes/seed-deals.js
git add backend/server.js
git commit -m "Add deals system"
git push origin main
```

## ✅ Step 2: Check Render Logs

1. Go to your Render dashboard
2. Click on your backend service
3. Click "Logs" tab
4. Look for the exact error message

Common errors:
- `Cannot find module './src/tables/deal'` - File not committed
- `SyntaxError` - Code syntax error
- `MongoError` - Database connection issue

## ✅ Step 3: Make Deals Optional (Temporary Fix)

If you want to deploy without deals temporarily, wrap the deals import in a try-catch:

### In `backend/src/routes/properties.js`:

```javascript
// At the top
let Deal;
try {
  Deal = require('../tables/deal');
} catch (e) {
  console.warn('Deal model not available');
  Deal = null;
}

// In the route handler (around line 485)
// Fetch active deals for these properties
const propertyIds = properties.map(p => p._id);
const now = new Date();
let activeDeals = [];

if (Deal) {
  try {
    activeDeals = await Deal.find({
      property: { $in: propertyIds },
      isActive: true,
      isPublished: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    }).select('property dealType title tagline discountType discountValue badge badgeColor priority');
  } catch (error) {
    console.error('Error fetching deals:', error);
  }
}
```

### In `backend/server.js`:

```javascript
// Wrap deals routes in try-catch
try {
  const dealsRouter = require('./src/routes/deals');
  const seedDealsRouter = require('./src/routes/seed-deals');
  app.use('/api/deals', dealsRouter);
  app.use('/api/seed', seedDealsRouter);
} catch (error) {
  console.warn('Deals routes not available:', error.message);
}
```

## ✅ Step 4: Environment Variables

Make sure these are set in Render:
- `MONGO_URI` - Your MongoDB connection string
- `JWT_SECRET` - Your JWT secret
- `NODE_ENV` - Set to `production`

## ✅ Step 5: Redeploy

After making changes:
1. Commit and push to git
2. Render will auto-deploy
3. Check logs for success

## 🔍 Debugging Steps

### Check if files exist on Render:

In Render Shell (or logs), run:
```bash
ls -la backend/src/tables/
ls -la backend/src/routes/
```

Should show:
- `deal.js` in tables
- `deals.js` in routes
- `seed-deals.js` in routes

### Test locally first:

```bash
cd backend
npm install
npm start
```

If it works locally but not on Render, it's likely a git/deployment issue.

## 🚨 Quick Rollback

If you need to deploy without deals immediately:

### Option 1: Comment out deals imports in server.js

```javascript
// const dealsRouter = require('./src/routes/deals');
// const seedDealsRouter = require('./src/routes/seed-deals');

// app.use('/api/deals', dealsRouter);
// app.use('/api/seed', seedDealsRouter);
```

### Option 2: Comment out Deal import in properties.js

```javascript
// const Deal = require('../tables/deal');

// Then in the route, skip deals fetching:
// const activeDeals = []; // Empty array
```

## ✅ Proper Fix

1. **Verify all files are committed:**
   ```bash
   git status
   git log --oneline -5
   ```

2. **Check package.json has no errors:**
   ```bash
   cd backend
   npm install
   ```

3. **Test build locally:**
   ```bash
   npm start
   ```

4. **Push to git:**
   ```bash
   git push origin main
   ```

5. **Monitor Render logs** during deployment

## 📋 Files That Must Be Committed

```
backend/
├── src/
│   ├── tables/
│   │   └── deal.js          ✅ NEW
│   └── routes/
│       ├── deals.js         ✅ NEW
│       ├── seed-deals.js    ✅ NEW
│       └── properties.js    ✅ MODIFIED
└── server.js                ✅ MODIFIED
```

## 🎯 Most Likely Issue

**The deal.js file wasn't committed to git.**

Run:
```bash
git add backend/src/tables/deal.js
git add backend/src/routes/deals.js
git add backend/src/routes/seed-deals.js
git commit -m "Add deals system files"
git push origin main
```

Then check Render logs again.

## 💡 Alternative: Deploy Without Deals

If you want to deploy the backend without deals for now:

1. Revert the changes to `server.js` and `properties.js`
2. Deploy successfully
3. Add deals later in a separate deployment

```bash
git checkout HEAD -- backend/server.js
git checkout HEAD -- backend/src/routes/properties.js
git commit -m "Revert deals changes temporarily"
git push origin main
```

---

**Need the exact error?** Share the Render logs and I can provide a specific fix!
