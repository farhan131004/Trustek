import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import fakeNewsRoutes from './routes/fakeNews';
import reviewAnalyzerRoutes from './routes/reviewAnalyzer';
import websiteScannerRoutes from './routes/websiteScanner';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// Health check
app.get('/health', (_, res) => res.status(200).json({ status: 'OK' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fake-news', fakeNewsRoutes);
app.use('/api/review-analyzer', reviewAnalyzerRoutes);
app.use('/api/website-scanner', websiteScannerRoutes);

// Error handler
app.use(errorHandler);

// MongoDB + Server startup
async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI is not defined in .env");

    // Enable debug logging for mongoose
    mongoose.set('debug', true);

    await mongoose.connect(mongoUri);
    logger.info('✅ MongoDB connected successfully');

    app.listen(PORT, () => {
      const baseUrl = `http://localhost:${PORT}`;
      console.log("\n===============================");
      console.log("🚀 Trustek Backend Started!");
      console.log(`🌍 API Base URL: ${baseUrl}`);
      console.log(`🩺 Health Check: ${baseUrl}/health`);
      console.log("===============================\n");
    });
    
    
    
  } catch (err) {
    logger.error('❌ Server failed to start:', err);
    process.exit(1);
  }
}

// Handle uncaught exceptions & unhandled rejections globally
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});

startServer();
