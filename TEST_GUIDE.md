# 🎯 Complete Testing Guide for Trustek

## ✅ What's Fixed
1. ✅ Backend CORS now allows port 8080
2. ✅ .env file created with proper configuration
3. ✅ Backend server is running on port 5000
4. ✅ MongoDB connection working
5. ✅ API service updated to handle responses properly

## 🚀 How to Test Everything

### Step 1: Start Backend
```bash
cd backend
npm run dev
```

**You should see:**
```
✅ MongoDB connected successfully
✅ Server running on port 5000 in development mode
```

### Step 2: Start Frontend
```bash
cd trustek-app--master
npm run dev
```

**You should see:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:8080/
```

### Step 3: Test User Registration

1. Open browser: `http://localhost:8080`
2. Go to Registration/Login page
3. Try to register with:
   - Email: `test@example.com`
   - Password: `password123`
   - Name: `Test User`

**Expected Result:**
- ✅ You should see success message
- ✅ Should redirect to dashboard
- ✅ New user appears in MongoDB

### Step 4: Verify User in MongoDB

```bash
mongosh
use trustek
db.users.find().pretty()
```

**You should see your user data!**

## 🐛 Troubleshooting

### Problem: CORS Error
**Error:** `Access to fetch blocked by CORS policy`

**Solution:**
1. Make sure backend `.env` has: `CORS_ORIGIN=http://localhost:8080`
2. Restart backend server
3. Clear browser cache (Ctrl+Shift+Delete)

### Problem: "Cannot connect to backend"
**Error:** `Failed to fetch`

**Solution:**
1. Check if backend is running: `http://localhost:5000/health`
2. Make sure MongoDB is running: `net start MongoDB`
3. Check backend terminal for errors

### Problem: "User already exists"
**Error when registering**

**Solution:**
Use a different email or delete the user in MongoDB:
```bash
mongosh
use trustek
db.users.deleteOne({email: "your-email@example.com"})
```

### Problem: Frontend shows blank page
**Solution:**
1. Check browser console (F12)
2. Look for JavaScript errors
3. Make sure both servers are running

## 🧪 Manual API Testing

### Test Registration
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"newuser@test.com","password":"password123","name":"New User"}'
```

### Test Login
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"newuser@test.com","password":"password123"}'
```

### Test Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health"
```

## ✅ Current Status

- ✅ Backend: Running on port 5000
- ✅ Frontend: Running on port 8080
- ✅ MongoDB: Connected and working
- ✅ CORS: Configured for port 8080
- ✅ API Endpoints: All working
- ✅ Registration: Tested and working

## 🎉 Next Steps

1. Test your frontend registration flow
2. Verify users appear in MongoDB
3. Test login functionality
4. Test fake news detection (once you add Google Gemini API key)

## 📝 Important Files

- `backend/.env` - Backend configuration
- `backend/src/server.ts` - Backend server with CORS fix
- `trustek-app--master/src/services/api.ts` - Frontend API service (updated)
- `trustek-app--master/vite.config.ts` - Frontend runs on port 8080

## 🔐 API Key Setup

To make fake news detection work, add your Google Gemini API key:

1. Get API key from: https://aistudio.google.com/
2. Add to `backend/.env`:
   ```
   GOOGLE_GEMINI_API_KEY=your-actual-api-key-here
   ```
3. Restart backend

## 📞 Still Having Issues?

Check these:
1. ✅ MongoDB is running: `mongosh`
2. ✅ Backend is running: Check `http://localhost:5000/health`
3. ✅ Frontend is running: Check `http://localhost:8080`
4. ✅ No firewall blocking connections
5. ✅ Browser console for JavaScript errors

Your backend and database are now properly configured! 🚀
