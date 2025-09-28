# Image Upload Error Troubleshooting Guide

## 🚨 Error: "Unexpected token '<',"<!DOCTYPE"... IS NOT A VALID json"

This error occurs when the backend server returns HTML instead of JSON. Here's how to fix it:

## 🔍 **Step 1: Check if Backend Server is Running**

1. **Open a new terminal and navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Start the backend server:**
   ```bash
   npm start
   ```

3. **You should see output like:**
   ```
   Connected to MongoDB
   Server running on port 5000
   ```

## 🔍 **Step 2: Test the Backend API**

1. **Test the health endpoint:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"ok"}`

2. **Test the API endpoint:**
   ```bash
   curl http://localhost:5000/api/test
   ```
   Should return: `{"message":"API is working",...}`

## 🔍 **Step 3: Check Frontend Configuration**

1. **Make sure the frontend is pointing to the correct backend URL:**
   - Check `frontend/.env` file
   - Should contain: `VITE_API_URL=http://localhost:5000`

2. **If no .env file exists, create one:**
   ```bash
   cd frontend
   echo "VITE_API_URL=http://localhost:5000" > .env
   ```

## 🔍 **Step 4: Test Image Upload Manually**

1. **Run the test script:**
   ```bash
   node test-image-upload.js
   ```

2. **Check the console output for specific error messages**

## 🔍 **Step 5: Check Browser Console**

1. **Open browser developer tools (F12)**
2. **Go to Console tab**
3. **Try uploading an image**
4. **Look for error messages in the console**

## 🔍 **Step 6: Check Network Tab**

1. **Open browser developer tools (F12)**
2. **Go to Network tab**
3. **Try uploading an image**
4. **Look for the request to `/api/properties/upload/images`**
5. **Check the response status and content**

## 🛠️ **Common Solutions**

### Solution 1: Backend Server Not Running
```bash
cd backend
npm install
npm start
```

### Solution 2: Port Already in Use
```bash
# Kill process using port 5000
npx kill-port 5000
# Then restart
cd backend && npm start
```

### Solution 3: CORS Issues
The CORS configuration should already be set up, but if you're still having issues:
```javascript
// In backend/src/server.js
app.use(cors({ 
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true 
}));
```

### Solution 4: Authentication Issues
Make sure you're logged in before trying to upload images. The upload endpoint requires authentication.

## 🔧 **Debug Steps**

1. **Check if uploads directory exists:**
   ```bash
   ls -la backend/uploads
   ```

2. **Create uploads directory if it doesn't exist:**
   ```bash
   mkdir -p backend/uploads
   ```

3. **Check file permissions:**
   ```bash
   chmod 755 backend/uploads
   ```

## 📝 **Expected Behavior**

When working correctly:
1. Backend server runs on port 5000
2. Frontend runs on port 5173
3. Image upload should return JSON response like:
   ```json
   {
     "success": true,
     "imageUrls": ["/uploads/1234567890-123456789.png"],
     "message": "Images uploaded successfully"
   }
   ```

## 🚨 **If Still Not Working**

1. **Check the backend console for error messages**
2. **Check the frontend console for error messages**
3. **Verify all dependencies are installed:**
   ```bash
   cd backend && npm install
   cd frontend && npm install
   ```
4. **Try restarting both servers:**
   ```bash
   # Backend
   cd backend && npm start
   
   # Frontend (in new terminal)
   cd frontend && npm run dev
   ```

## 📞 **Need Help?**

If you're still having issues:
1. Check the browser console for specific error messages
2. Check the backend console for error messages
3. Make sure both servers are running
4. Verify the API URL configuration

The error should be resolved once the backend server is running properly!
