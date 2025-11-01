# Trustek - Fake News Detection Platform

A full-stack application for detecting fake news using AI and machine learning.

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   React Frontend│◄────────┤  Spring Boot    │◄────────┤  Python Flask   │
│   (Vite + TS)   │         │   Backend (API) │         │  ML Service     │
│                 │         │                 │         │  (BERT Model)   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │   MySQL Database│
                            │   (trustek_db)  │
                            └─────────────────┘
```

## 📁 Project Structure

```
trustek/
├── backend/              # Spring Boot backend (Java)
│   ├── src/main/java/   # Java source code
│   ├── src/main/resources/  # Configuration
│   └── pom.xml          # Maven dependencies
├── ml-service/          # Python Flask ML service
│   ├── app.py          # Flask application
│   └── requirements.txt # Python dependencies
└── trustek-app--master/        # React frontend
    ├── src/            # React source code
    └── package.json    # Node dependencies
```

## 🚀 Quick Start

### Prerequisites

- **Java 23+** and **Maven 3.6+**
- **MySQL 8.0+**
- **Python 3.9+**
- **Node.js 18+** and **npm**

### Step 1: Setup Database

```bash
# Start MySQL and create database
mysql -u root -p
CREATE DATABASE trustek_db;
EXIT;
```

### Step 2: Start ML Service

```bash
cd ml-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run service
python app.py
```

The ML service will start on **http://localhost:8000**

### Step 3: Start Backend

```bash
cd backend

# Configure database in application.properties
# Update username and password

# Build and run
mvn clean install
mvn spring-boot:run
```

The backend will start on **http://localhost:5000**

### Step 4: Start Frontend

```bash
cd trustek-app--master

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on **http://localhost:5173**

## 🔑 Features

### Authentication
- User registration and login
- JWT-based authentication
- Secure password hashing with BCrypt

### Fake News Detection
- AI-powered text analysis using BERT
- Confidence scoring
- Analysis history tracking

### User Dashboard
- View analysis history
- Real-time analysis
- User statistics

## 📡 API Endpoints

### Public Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Protected Endpoints (JWT Required)

#### Analyze Fake News
```http
POST /api/fake-news/analyze
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "text": "Your news article text here..."
}
```

## 🧪 Testing

### Test ML Service
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Scientists discover unicorns exist!"}'
```

### Test Backend
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"pass123"}'

# Analyze (use token from login response)
curl -X POST http://localhost:5000/api/fake-news/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Breaking news article..."}'
```

## 🔧 Configuration

### Backend Configuration

Edit `backend/src/main/resources/application.properties`:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/trustek_db
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD

# JWT
jwt.secret=your-secret-key-here

# ML Service
ml.service.url=http://localhost:8000
```

### ML Service Configuration

Default configuration in `ml-service/app.py`:
- Port: 8000
- Model: Auto-selected based on hardware
- Max text length: 512 tokens

## 📦 Technology Stack

### Backend
- **Spring Boot 3.2** - Java framework
- **Spring Security** - Authentication & authorization
- **Spring Data JPA** - Database abstraction
- **MySQL** - Relational database
- **JWT** - Token-based authentication
- **Lombok** - Boilerplate reduction

### ML Service
- **Flask** - Python web framework
- **Transformers** - HuggingFace library
- **PyTorch** - Deep learning framework
- **BERT** - Pre-trained language model

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling

## 🐛 Troubleshooting

### Backend Issues
1. **Port 5000 in use**: Change `server.port` in application.properties
2. **Database connection failed**: Check MySQL credentials and ensure MySQL is running
3. **ML service timeout**: Ensure Flask service is running on port 8000

### ML Service Issues
1. **Model download slow**: First run downloads model (~500MB). Be patient!
2. **Out of memory**: Ensure 4GB+ free RAM
3. **CUDA not found**: GPU support optional. CPU works fine.

### Frontend Issues
1. **API connection failed**: Check backend is running on port 5000
2. **CORS errors**: Backend CORS is configured for localhost:5173

## 📝 Development

### Backend Development
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.profiles.active=dev"
```

### Frontend Development
```bash
cd trustek-app--master
npm run dev
```

## 🚀 Production Deployment

1. Build backend JAR: `mvn clean package`
2. Build frontend: `npm run build`
3. Deploy backend to server
4. Deploy frontend to CDN/static hosting
5. Update configuration with production URLs

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributors

Trustek Development Team

## 🙏 Acknowledgments

- HuggingFace for pre-trained models
- Spring Boot community
- React community

