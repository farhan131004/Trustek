# Trustek Backend - Spring Boot + MySQL

This is the Spring Boot backend API for the Trustek Fake News Detection Platform.

## 📋 Prerequisites

- **Java 23** or higher
- **Maven 3.6+**
- **MySQL 8.0+**
- **Python 3.9+** (for ML microservice)

## 🗄️ Database Setup

1. Install MySQL if not already installed
2. Create the database:
```sql
CREATE DATABASE trustek_db;
```

3. Update database credentials in `src/main/resources/application.properties`:
```properties
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD
```

## 🚀 Running the Application

### Option 1: Using Maven

```bash
# Navigate to backend directory
cd backend

# Install dependencies and compile
mvn clean install

# Run the application
mvn spring-boot:run
```

### Option 2: Using JAR

```bash
# Build JAR file
mvn clean package

# Run JAR
java -jar target/backend-1.0.0.jar
```

The application will start on **http://localhost:5000**

## 📡 API Endpoints

### Authentication (Public)

#### Register
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

### Fake News Detection (Protected - JWT Required)

#### Analyze Fake News
```http
POST /api/fake-news/analyze
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "text": "Your news article text here..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Analysis completed successfully",
  "result": {
    "verdict": "FAKE",
    "confidence": 0.92
  }
}
```

### Get Current User (Protected)
```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:
- **Access Token**: Valid for 1 hour
- **Refresh Token**: Valid for 7 days

Include the access token in the `Authorization` header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 🧪 Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Analyze Fake News
```bash
curl -X POST http://localhost:5000/api/fake-news/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"text":"Breaking news: Scientists discover unicorns exist!"}'
```

## 🔧 Configuration

Key configuration in `application.properties`:

```properties
# Server
server.port=5000

# Database
spring.datasource.url=jdbc:mysql://localhost:3306/trustek_db
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD

# JWT
jwt.secret=your-secret-key
jwt.access-token.expiration=3600000  # 1 hour
jwt.refresh-token.expiration=604800000  # 7 days

# ML Service
ml.service.url=http://localhost:8000
```

## 📦 Project Structure

```
backend/
├── src/main/java/com/trustek/
│   ├── entity/          # JPA entities (User, AnalysisHistory)
│   ├── repository/      # Data access layer
│   ├── service/         # Business logic
│   ├── controller/      # REST controllers
│   ├── config/          # Configuration classes
│   ├── security/        # Security & JWT
│   └── dto/             # Data transfer objects
├── src/main/resources/
│   └── application.properties
└── pom.xml
```

## 🐛 Troubleshooting

1. **Port 5000 already in use**: Change `server.port` in `application.properties`
2. **Database connection error**: Check MySQL credentials and ensure MySQL is running
3. **ML service unavailable**: Ensure the Python Flask service is running on port 8000
4. **Compilation errors**: Ensure Java 23 is installed and `JAVA_HOME` is set

## 📝 Notes

- The backend automatically creates database tables on startup
- All `/api/fake-news/**` endpoints require JWT authentication
- Analysis history is automatically saved to the database

