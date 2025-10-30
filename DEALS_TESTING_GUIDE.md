# Deals System Testing Guide

## 🔍 Why Deals Aren't Showing

Deals won't display on properties until you:
1. **Create deals in the database**
2. **Ensure deals are active and published**
3. **Verify deal validity dates are current**

## ✅ Quick Fix - Seed Demo Deals

### Step 1: Start Your Server
```bash
cd backend
npm start
```

### Step 2: Seed Demo Deals
Use any of these methods:

#### Option A: Using Postman/Thunder Client
```
POST http://localhost:5001/api/seed/seed-demo-deals
```

#### Option B: Using curl
```bash
curl -X POST http://localhost:5001/api/seed/seed-demo-deals
```

#### Option C: Using Browser Console
Open your browser console and run:
```javascript
fetch('http://localhost:5001/api/seed/seed-demo-deals', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Deals created:', data))
```

### Step 3: Verify Deals Were Created
Check the response - you should see:
```json
{
  "message": "Demo deals created successfully",
  "count": 5,
  "deals": [...]
}
```

### Step 4: Refresh Property Listings
1. Go to `/apartments` in your app
2. You should now see deal badges on properties:
   - "Early Bird Special - Save 25%"
   - "Last Minute Deal - 30% OFF"
   - "Long Stay Discount - 20% OFF"
   - etc.

## 🎯 Manual Deal Creation

### For Property Owners:
1. Login as a property owner
2. Go to your dashboard
3. Navigate to "Deals & Promotions" (if integrated)
4. Click "Create Deal"
5. Fill in:
   - **Deal Type**: Choose from 10 types
   - **Title**: e.g., "Early Bird - Save 25%"
   - **Discount**: 25% (percentage)
   - **Valid From**: Today's date
   - **Valid Until**: 60 days from now
   - **Conditions**: e.g., Min 30 days advance booking
6. Set **Active** and **Published** to true
7. Save

## 🔧 Troubleshooting

### Issue: "No deals showing on properties"

**Check 1: Are there deals in the database?**
```bash
# In MongoDB shell or Compass
db.deals.find({ isActive: true, isPublished: true }).count()
```

**Check 2: Are deals valid?**
```bash
# Check if deals have current validity dates
db.deals.find({
  isActive: true,
  isPublished: true,
  validFrom: { $lte: new Date() },
  validUntil: { $gte: new Date() }
})
```

**Check 3: Check backend logs**
Look for this line in your server console:
```
[Deals] Found X active deals for Y properties
```
- If X = 0, no deals exist or they're not active/published
- If X > 0, deals exist and should display

**Check 4: Check browser console**
Open browser DevTools (F12) and check:
1. Network tab - look for `/api/properties` request
2. Check the response - properties should have:
   ```json
   {
     "bestDeal": { "title": "...", "discountValue": 25, ... },
     "activeDealsCount": 1,
     "activeDeals": [...]
   }
   ```

**Check 5: Verify PropertyDealBadge component**
In browser console:
```javascript
// Check if component is imported
console.log(document.querySelector('[class*="PropertyDealBadge"]'))
```

## 🎨 What You Should See

### On Property Cards:
```
┌─────────────────────────────┐
│  [Property Image]           │
│  ┌─────────────────────┐    │
│  │ 🔥 Early Bird - 25% │    │ <- Deal Badge
│  └─────────────────────┘    │
│  💰 25% OFF                  │ <- Discount
│                              │
│  Property Title              │
│  📍 Location                 │
│  ⭐ Rating                   │
└─────────────────────────────┘
```

### On Deals Page (`/deals`):
```
┌─────────────────────────────┐
│  [City Image]               │
│  ┌───────────────┐          │
│  │ 5 Deals       │ <- Badge │
│  └───────────────┘          │
│                              │
│  Kigali                      │
│  From $50 per night          │
└─────────────────────────────┘
```

## 📊 Test Data Created

When you run seed-demo-deals, it creates:

1. **Early Bird Deal** (25% OFF)
   - Book 30+ days ahead
   - Hot Deal badge (red)

2. **Last Minute Deal** (30% OFF)
   - Book within 7 days
   - Limited Time badge (orange)

3. **Long Stay Deal** (20% OFF)
   - Stay 7+ nights
   - Best Value badge (teal)

4. **Weekend Special** (15% OFF)
   - Friday-Sunday only
   - Popular badge (green)

5. **Flash Sale** (40% OFF)
   - No conditions
   - Hot Deal badge (pink)

## 🧹 Clear Test Data

To remove all deals and start fresh:
```bash
curl -X DELETE http://localhost:5001/api/seed/clear-all-deals
```

## 🚀 Next Steps

Once deals are showing:
1. Test filtering by deal type on `/deals` page
2. Test booking with a deal applied
3. Create custom deals for your properties
4. Monitor deal analytics (views, clicks, bookings)

## 📝 Common Mistakes

❌ **Deal not active** - Set `isActive: true`
❌ **Deal not published** - Set `isPublished: true`
❌ **Invalid dates** - Ensure `validFrom` ≤ now ≤ `validUntil`
❌ **Wrong property ID** - Verify property exists
❌ **Frontend not refreshed** - Hard refresh (Ctrl+Shift+R)

## ✅ Success Checklist

- [ ] Backend server running
- [ ] Demo deals seeded
- [ ] Properties page shows deal badges
- [ ] Deals page shows destinations with counts
- [ ] Can click on deals to see properties
- [ ] Deal discounts display correctly
- [ ] Console shows no errors

---

**Need Help?** Check the server logs for `[Deals]` messages to see if deals are being fetched.
