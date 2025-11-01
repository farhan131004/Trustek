# Trustek Backend API

A comprehensive backend API for the Trustek Shield platform, providing fake news detection, review analysis, and website security scanning capabilities.

## Features

- 🔐 **JWT-based Authentication** - Secure user registration, login, and session management
- 📰 **Fake News Detection** - AI-powered analysis using Google Gemini with Google Search grounding
- ⭐ **Review Analyzer** - Detect fake reviews and suspicious rating patterns
- 🌐 **Website Scanner** - Security analysis using VirusTotal and PhishTank APIs
- 📊 **Analytics Dashboard** - User statistics and analysis history
- 🛡️ **Security Features** - Rate limiting, CORS, helmet security headers
- 📝 **Comprehensive Logging** - Winston-based logging with file rotation
- 🗄️ **MongoDB Integration** - Mongoose ODM with proper indexing

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with refresh tokens
- **AI Services**: Google Gemini API
- **Security APIs**: VirusTotal, PhishTank
- **Logging**: Winston
- **Validation**: Express Validator

## Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- Google Gemini API key
- (Optional) VirusTotal API key
- (Optional) PhishTank API key

## Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/trustek
   JWT_SECRET=your-super-secret-jwt-key
   GOOGLE_GEMINI_API_KEY=your-google-gemini-api-key
   VIRUSTOTAL_API_KEY=your-virustotal-api-key
   PHISHTANK_API_KEY=your-phishtank-api-key
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/change-password` - Change password
- `GET /api/users/analysis-history` - Get analysis history
- `GET /api/users/stats` - Get user statistics
- `DELETE /api/users/account` - Delete account

### Fake News Detection
- `POST /api/fake-news/analyze` - Analyze text for fake news
- `GET /api/fake-news/history` - Get analysis history
- `GET /api/fake-news/stats` - Get analysis statistics

### Review Analyzer
- `POST /api/review-analyzer/analyze` - Analyze review authenticity
- `POST /api/review-analyzer/batch-analyze` - Analyze multiple reviews
- `GET /api/review-analyzer/history` - Get analysis history
- `GET /api/review-analyzer/stats` - Get analysis statistics

### Website Scanner
- `POST /api/website-scanner/scan` - Scan website for threats
- `GET /api/website-scanner/history` - Get scan history
- `GET /api/website-scanner/stats` - Get scan statistics

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Analyze Fake News
```bash
curl -X POST http://localhost:5000/api/fake-news/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Breaking: Scientists discover that vaccines cause autism"
  }'
```

### Scan Website
```bash
curl -X POST http://localhost:5000/api/website-scanner/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://example.com"
  }'
```

## Database Schema

### User Model
```typescript
{
  email: string (unique, required)
  password: string (hashed, required)
  name: string (required)
  registerNumber?: string
  isEmailVerified: boolean (default: false)
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}
```

### AnalysisResult Model
```typescript
{
  userId: string (ref: User)
  type: 'fake_news' | 'review' | 'website'
  input: string
  result: {
    verdict: 'TRUE' | 'FALSE' | 'UNVERIFIED' | 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS'
    confidence: number (0-1)
    summary: string
    sources?: Array<{uri: string, title: string, domain: string}>
    details?: any
  }
  metadata: {
    processingTime: number
    apiUsed: string
    timestamp: Date
  }
  createdAt: Date
  updatedAt: Date
}
```

## Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcryptjs
- **Rate Limiting** to prevent abuse
- **CORS Protection** with configurable origins
- **Helmet Security Headers** for additional protection
- **Input Validation** using express-validator
- **Error Handling** with proper HTTP status codes

## Monitoring & Logging

- **Winston Logger** with multiple transports
- **Request Logging** with Morgan middleware
- **Error Tracking** with stack traces
- **Performance Monitoring** with processing time tracking
- **Log Rotation** with size limits

## Deployment

### Using PM2
```bash
# Install PM2 globally
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start dist/server.js --name trustek-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `5000` |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRE` | JWT expiration time | No | `7d` |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `VIRUSTOTAL_API_KEY` | VirusTotal API key | No | - |
| `PHISHTANK_API_KEY` | PhishTank API key | No | - |
| `CORS_ORIGIN` | CORS allowed origin | No | `http://localhost:5173` |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
