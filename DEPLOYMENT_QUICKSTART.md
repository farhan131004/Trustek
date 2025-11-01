# Quick Start Guide - Trustek Platform

Get up and running in 5 minutes! ⚡

## Prerequisites Check

```bash
java -version      # Should show Java 23
mvn -version       # Should show Maven 3.6+
python --version   # Should show Python 3.9+
mysql --version    # Should show MySQL 8.0+
node --version     # Should show Node 18+
```

## 🚀 Quick Start (3 Steps)

### Step 1: Database (30 seconds)

```bash
mysql -u root -p
```

```sql
CREATE DATABASE trustek_db;
EXIT;
```

### Step 2: ML Service (2 minutes)

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate  # Windows (PowerShell)
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python app.py
```

**Expected output**: `Model loaded successfully` + `Starting Flask server on port 8000...`

✅ Leave this terminal open!

### Step 3: Backend + Frontend (2 minutes)

**Open NEW terminal 1 - Backend:**
```bash
cd backend
# Edit src/main/resources/application.properties - set MySQL password
mvn spring-boot:run
```

**Open NEW terminal 2 - Frontend:**
```bash
cd trustek-app--master
npm install
npm run dev
```

✅ Both should start without errors!

## 🎉 Verify It Works

Open browser: **http://localhost:5173**

1. Click "Sign Up"
2. Register: `test@example.com` / `password123`
3. Click "Fake News Detection"
4. Paste text: `Scientists discover unicorns exist!`
5. Click "Analyze"
6. See result! 🎊

## 🐛 Quick Troubleshooting

### "Port 8000 in use"
→ Kill process: `taskkill /F /IM python.exe` (Windows)
→ Or change port in `ml-service/app.py`

### "Cannot connect to database"
→ Check MySQL is running: `mysql -u root -p`
→ Verify password in `application.properties`

### "Model download slow"
→ First run downloads ~500MB model
→ Be patient, wait 5-10 minutes
→ Subsequent runs are instant

### "Maven build fails"
→ Ensure Java 23 is installed
→ Check `JAVA_HOME` environment variable

### "npm install fails"
→ Use Node.js 18+
→ Delete `node_modules` and try again

## 📊 All Running? Check These URLs

| Service | URL | Status Check |
|---------|-----|--------------|
| ML Service | http://localhost:8000/health | Should return `{"status":"healthy"}` |
| Backend | http://localhost:5000/api/auth/login | Try POST with credentials |
| Frontend | http://localhost:5173 | Should show login page |

## 🎯 Common Commands

```bash
# Start ML Service
cd ml-service && python app.py

# Start Backend
cd backend && mvn spring-boot:run

# Start Frontend
cd trustek-app--master && npm run dev

# Test ML Service
curl http://localhost:8000/health

# Test Backend
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"test@example.com","password":"pass123"}'
```

## 📝 Configuration Summary

**Database** (`backend/src/main/resources/application.properties`):
```properties
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

**Ports**:
- Frontend: 5173
- Backend: 5000
- ML Service: 8000
- MySQL: 3306

## ✨ Features Working

✅ User registration and login
✅ JWT authentication
✅ Fake news detection with AI
✅ Confidence scoring
✅ History tracking
✅ Modern React UI

## 🎓 Next Steps

- Read `SETUP_GUIDE.md` for detailed instructions
- See `MIGRATION_SUMMARY.md` for architecture details
- Check `README.md` for full documentation

## 📞 Need Help?

1. Check logs in terminal windows
2. Review error messages
3. See SETUP_GUIDE.md troubleshooting section
4. Verify all prerequisites installed

---

**You're all set! Happy detecting fake news! 🚀**

