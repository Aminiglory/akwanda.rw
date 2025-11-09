# 🏨 Room Availability System - Complete Guide

## 📋 Overview
The booking system now includes **real-time room availability checking** that shows users whether their selected room is available for their chosen dates.

---

## ✅ Features Implemented

### 1. **Step-by-Step Availability Flow**

#### **Step 1: Start Booking**
- User clicks "View Available Rooms"
- No dates required yet

#### **Step 2: Room Selection**
- Shows all property rooms
- Info banner explains: "Select a room first, then check dates"
- Each room shows basic availability status
- User selects preferred room

#### **Step 3: Date Selection & Availability Check** ⭐ NEW
- User selects check-in and check-out dates
- **"Check Room Availability" button** appears
- System queries backend: `/api/properties/${id}/availability`
- Real-time availability check for selected room + dates

#### **Step 4: Contact Info**
- Only accessible if room is available

#### **Step 5: Payment**
- Complete booking

---

## 🎯 How Availability Checking Works

### **Backend Integration**
The system uses the existing availability API:
```javascript
POST /api/properties/${propertyId}/availability
Body: {
  checkIn: "2025-11-15",
  checkOut: "2025-11-20",
  guests: 2
}
```

**Backend Response:**
- Returns list of available rooms for those dates
- Checks against existing bookings
- Respects property owner's room locks

### **Frontend Logic**
```javascript
// When user clicks "Check Availability"
const checkAvailability = async () => {
  // 1. Send dates + guests to backend
  // 2. Backend checks database for conflicts
  // 3. Returns available rooms
  // 4. Frontend compares selected room with available list
  // 5. Shows green (available) or red (unavailable) message
}
```

---

## 🎨 Visual Indicators

### **In Step 3 (Date Selection):**

#### ✅ **Room Available**
```
┌─────────────────────────────────────────┐
│ ✓ Room Available!                       │
│ Room 1 is available for your selected   │
│ dates. You can proceed with booking.    │
└─────────────────────────────────────────┘
[Continue to Contact Info] ← Enabled
```

#### ❌ **Room Not Available**
```
┌─────────────────────────────────────────┐
│ ✗ Room Not Available                    │
│ Room 1 is already booked for            │
│ 11/15/2025 to 11/20/2025.              │
│ ← Choose a different room               │
└─────────────────────────────────────────┘
[Continue to Contact Info] ← Disabled
```

### **Selected Room Card:**
```
┌─────────────────────────────────────────┐
│ Selected Room: Room 1 - Deluxe          │
│ RWF 20,000 per night                    │
│                          [Not Available] │ ← Red badge if unavailable
└─────────────────────────────────────────┘
```

---

## 🔄 User Flow Examples

### **Scenario 1: Room is Available** ✅
1. User selects "Room 1"
2. Proceeds to date selection
3. Chooses dates: Nov 15 - Nov 20
4. Clicks "Check Room Availability"
5. System shows: ✅ "Room Available!"
6. User continues to contact info
7. Completes booking

### **Scenario 2: Room is NOT Available** ❌
1. User selects "Room 1"
2. Proceeds to date selection
3. Chooses dates: Nov 15 - Nov 20
4. Clicks "Check Room Availability"
5. System shows: ❌ "Room Not Available"
6. "Continue" button is disabled
7. User options:
   - Go back and select different room
   - Change dates
   - Contact property owner

---

## 🛠️ Technical Implementation

### **State Management**
```javascript
const [selectedRoomUnavailable, setSelectedRoomUnavailable] = useState(false);
const [loadingRooms, setLoadingRooms] = useState(false);
```

### **Availability Check Function**
```javascript
const checkAvailability = async () => {
  setLoadingRooms(true);
  
  // API call to check availability
  const response = await fetch(`/api/properties/${id}/availability`, {
    method: 'POST',
    body: JSON.stringify({
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      guests: bookingData.guests
    })
  });
  
  const data = await response.json();
  const availableRooms = data.availableRooms;
  
  // Check if selected room is in available list
  const isAvailable = availableRooms.some(room => 
    room._id === selectedRoom._id
  );
  
  setSelectedRoomUnavailable(!isAvailable);
  setLoadingRooms(false);
};
```

### **Validation Before Proceeding**
```javascript
// Continue button is disabled if room unavailable
<button
  onClick={() => setCurrentStep(4)}
  disabled={selectedRoomUnavailable}
  className={selectedRoomUnavailable 
    ? 'bg-gray-300 cursor-not-allowed' 
    : 'bg-blue-600 hover:bg-blue-700'
  }
>
  Continue to Contact Info
</button>
```

---

## 📱 User Experience Benefits

### **Clear Communication**
- ✅ Users know immediately if room is available
- ✅ No surprises at payment stage
- ✅ Clear error messages with solutions

### **Prevents Booking Conflicts**
- ✅ Can't proceed if room unavailable
- ✅ Backend validates again during final booking
- ✅ Property owner locks are respected

### **Flexible Options**
- ✅ Easy to go back and choose different room
- ✅ Can try different dates
- ✅ Visual feedback at every step

---

## 🔐 Backend Validation

Even with frontend checks, the backend ALWAYS validates:

```javascript
// Backend: /api/bookings (POST)
1. Check if room exists
2. Check if dates are valid
3. Query database for conflicting bookings
4. Check property owner locks
5. Only create booking if all checks pass
```

This ensures:
- ✅ No double bookings
- ✅ Security against manipulation
- ✅ Data integrity

---

## 🎯 Future Enhancements (Optional)

### **1. Calendar View**
Show blocked dates visually on a calendar:
```
November 2025
Su Mo Tu We Th Fr Sa
                1  2
 3  4  5  6  7  8  9
10 11 12 [13][14] 15  ← Blocked dates
16 17 18 19 20 21 22
```

### **2. Alternative Room Suggestions**
If selected room unavailable:
```
❌ Room 1 not available
💡 Try these similar rooms:
   - Room 2 (Deluxe) - Available
   - Room 5 (Deluxe) - Available
```

### **3. Partial Availability**
```
⚠️ Room 1 partially available
Available: Nov 15-17
Booked: Nov 18-20
Would you like to:
- Book Nov 15-17 only
- Choose different dates
```

### **4. Price Calendar**
Show prices for different dates:
```
Nov 15: RWF 20,000
Nov 16: RWF 20,000
Nov 17: RWF 25,000 (Weekend)
```

---

## 📊 Testing Checklist

- [ ] Select room → proceed to dates
- [ ] Enter dates → click "Check Availability"
- [ ] Verify green message if available
- [ ] Verify red message if unavailable
- [ ] Confirm "Continue" button disabled when unavailable
- [ ] Test "Back to Rooms" button
- [ ] Try different date ranges
- [ ] Test with multiple guests
- [ ] Verify backend validation on final booking

---

## 🎉 Summary

The availability system now provides:

✅ **Real-time availability checking**
✅ **Clear visual feedback** (green/red indicators)
✅ **Prevents booking conflicts**
✅ **User-friendly error messages**
✅ **Flexible navigation** (go back, change dates)
✅ **Backend validation** for security
✅ **Respects property owner locks**

Users can now confidently book rooms knowing exactly when they're available! 🏨✨
