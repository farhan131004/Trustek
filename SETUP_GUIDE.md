# Trustek Setup Guide

Complete step-by-step guide to set up and run the Trustek Fake News Detection Platform.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Java 23** or higher
   - Download from: https://www.oracle.com/java/technologies/downloads/
   - Verify: `java -version`

2. **Maven 3.6+**
   - Download from: https://maven.apache.org/download.cgi
   - Verify: `mvn -version`

3. **MySQL 8.0+**
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Verify: `mysql --version`

4. **Python 3.9+**
   - Download from: https://www.python.org/downloads/
   - Verify: `python --version`

5. **Node.js 18+** and **npm**
   - Download from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

## 🗄️ Step 1: Database Setup

### Windows

1. Open MySQL Command Line Client or MySQL Workbench
2. Create the database:

```sql
CREATE DATABASE trustek_db;
```

3. Note your MySQL username and password (default is `root`)

### Linux/Mac

```bash
mysql -u root -p
```

```sql
CREATE DATABASE trustek_db;
EXIT;
```

## 🐍 Step 2: ML Service Setup

1. Navigate to the ml-service directory:

```bash
cd ml-service
```

2. Create a virtual environment:

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

⚠️ **Note**: First installation will take 5-10 minutes as it downloads the BERT model (~500MB-1GB).

4. Start the ML service:

```bash
python app.py
```

You should see:
```
INFO:__main__:Initializing fake news detection model...
INFO:__main__:Loading bert-tiny model for CPU
INFO:__main__:Loading model: mrm8488/bert-tiny-finetuned-fake-news
...
INFO:__main__:Model loaded successfully
INFO:__main__:Starting Flask server on port 8000...
```

✅ ML service is now running on http://localhost:8000

### Test ML Service

Open a new terminal and run:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "model_loaded": true, "device": "cpu"}
```

## ☕ Step 3: Backend Setup (Spring Boot)

1. Navigate to the backend directory:

```bash
cd backend
```

2. Configure the database in `src/main/resources/application.properties`:

Open the file and update:
```properties
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

3. Build the project:

```bash
mvn clean install
```

4. Run the backend:

```bash
mvn spring-boot:run
```

You should see:
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.0)
...
Started BackendApplication in X.XXX seconds
```

✅ Backend is now running on http://localhost:5000

### Test Backend

```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

## ⚛️ Step 4: Frontend Setup

1. Navigate to the frontend directory:

```bash
cd trustek-app--master
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

You should see:
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

✅ Frontend is now running on http://localhost:5173

## 🎉 Step 5: Verify Everything Works

1. Open http://localhost:5173 in your browser

2. Register a new account:
   - Email: `test@example.com`
   - Password: `password123`
   - Name: `Test User`

3. Login with your credentials

4. Navigate to "Fake News Detection" from the sidebar

5. Enter some text for testing:
   ```
   Breaking news: Scientists have discovered a new planet in our solar system!
   ```

6. Click "Analyze" and wait for results

## 🐛 Troubleshooting

### ML Service Issues

**Problem**: Model download fails
**Solution**: 
- Check internet connection
- Set HuggingFace cache directory: `export HF_HOME=/path/to/cache`
- Try running again

**Problem**: Out of memory
**Solution**: 
- Close other applications
- Ensure 4GB+ free RAM
- Service uses ~2-4GB RAM

**Problem**: Port 8000 already in use
**Solution**: 
- Change port in `ml-service/app.py`
- Update `ml.service.url` in backend `application.properties`

### Backend Issues

**Problem**: Cannot connect to database
**Solution**:
- Verify MySQL is running: `mysql -u root -p`
- Check username/password in `application.properties`
- Ensure database `trustek_db` exists

**Problem**: Port 5000 already in use
**Solution**: 
- Change `server.port` in `application.properties`

**Problem**: Maven build fails
**Solution**:
- Ensure Java 23 is installed
- Set `JAVA_HOME` environment variable
- Try: `mvn clean` then `mvn install`

### Frontend Issues

**Problem**: Cannot connect to backend
**Solution**:
- Verify backend is running on port 5000
- Check browser console for CORS errors
- Ensure backend CORS config allows localhost:5173

**Problem**: npm install fails
**Solution**:
- Use Node.js 18+
- Try: `npm cache clean --force`
- Delete `node_modules` and run `npm install` again

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│                      (React Frontend)                        │
│                       localhost:5173                         │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Spring Boot Backend                       │
│                      (Java + MySQL)                          │
│                       localhost:5000                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth API   │  │  Fake News   │  │   User API   │      │
│  │   /api/auth  │  │  /api/fake-  │  │  /api/users  │      │
│  │              │  │    news      │  │              │      │
│  └──────────────┘  └──────┬───────┘  └──────────────┘      │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Python Flask ML Service                     │
│              (BERT Model + HuggingFace)                      │
│                       localhost:8000                         │
│                                                              │
│  ┌──────────────┐                                           │
│  │   /analyze   │  ┌──────────────────────────────┐         │
│  │              │  │  Fake News Detection Model   │         │
│  │              │  │    (BERT Transformer)        │         │
│  └──────┬───────┘  └──────────────────────────────┘         │
└─────────┼────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                       MySQL Database                         │
│                        localhost:3306                        │
│                                                              │
│  ┌──────────────┐  ┌───────────────────────────┐            │
│  │     Users    │  │   AnalysisHistory         │            │
│  │              │  │                           │            │
│  │  - id        │  │  - id                     │            │
│  │  - name      │  │  - userId                 │            │
│  │  - email     │  │  - inputText              │            │
│  │  - password  │  │  - verdict                │            │
│  │  - createdAt │  │  - confidence             │            │
│  └──────────────┘  │  - createdAt              │            │
│                    └───────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Production Deployment

For production deployment:

1. **Backend**:
   - Build JAR: `mvn clean package`
   - Deploy JAR to server
   - Configure production database
   - Set secure JWT secret

2. **ML Service**:
   - Use production WSGI server (Gunicorn)
   - Configure for multiple workers
   - Set up model caching

3. **Frontend**:
   - Build: `npm run build`
   - Deploy to CDN or static hosting
   - Update API URLs

## 📞 Support

For issues or questions:
- Check the troubleshooting section above
- Review logs in:
  - Backend: Console output
  - ML Service: Console output
  - Frontend: Browser console

## ✨ Next Steps

- Customize JWT expiration times
- Add more ML models
- Implement user profiles
- Add email notifications
- Set up automated testing

Happy coding! 🎉

