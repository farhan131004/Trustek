# Quick Start - Trustek Integration

## 🚀 Start All Services

### Terminal 1: ML Service
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
python app.py
```
✅ Running on http://localhost:5001

### Terminal 2: Backend
```bash
cd backend
mvn spring-boot:run
```
✅ Running on http://localhost:8080

### Terminal 3: Frontend
```bash
cd trustek-app--master
npm install
npm run dev
```
✅ Running on http://localhost:8081

## 🧪 Quick Test

1. Open browser: http://localhost:8081
2. Register a new user
3. Login
4. Use the ML features!

## 📋 Requirements

- ✅ Java 21+
- ✅ Maven 3.6+
- ✅ Python 3.9+
- ✅ Node.js 18+
- ✅ MySQL 8.0+
- ✅ 4GB+ RAM (for ML models)

## 🔗 Endpoints

| Endpoint | Method | Auth |
|----------|--------|------|
| /api/auth/register | POST | No |
| /api/auth/login | POST | No |
| /api/ml/fake-news | POST | Yes |
| /api/ml/review | POST | Yes |
| /api/ml/scan | POST | Yes |
| /api/ml/health | GET | Yes |

## ⚠️ Important Notes

1. **First run** will download ML models (~500MB-1GB)
2. **MySQL password** is set to `root` (change in production!)
3. **All ML endpoints** require JWT authentication
4. **Database** auto-creates tables on first run

## 🐛 Common Issues

**Port already in use?**
- Kill the process or change the port in config

**ML service slow?**
- First run downloads models, subsequent runs are instant

**Can't connect to database?**
- Verify MySQL is running
- Check password in `application.properties`

---

**Everything Ready?** Open http://localhost:8081 and start using Trustek! 🎉


