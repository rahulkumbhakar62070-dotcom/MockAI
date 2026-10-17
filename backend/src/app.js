import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';

const app = express();

// 1. Security: Disable X-Powered-By header to obscure server technology
app.disable('x-powered-by');

// 2. Request Body Limiters (100kb max) to prevent payload-based Denial of Service
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 3. CORS Configuration
// Allows requests from configured production frontend origins, localhost, and 127.0.0.1
const configuredClientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
      .map((u) => u.trim().replace(/\/$/, ''))
      .filter(Boolean)
  : [];

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const allowedOrigins = Array.from(new Set([...configuredClientUrls, ...defaultOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, internal server requests)
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);


// 4. General Rate Limiter for all API routes
app.use('/api', apiLimiter);

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'AI Mock Interview Platform Backend API is running',
    version: '1.0.0',
    phase: 'Phase 9: Backend Security and API Validation',
  });
});

// 5. Health Check Endpoint (GET /api/health)
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    status: 'success',
    message: 'Backend is running and healthy',
    timestamp: new Date().toISOString(),
    database: {
      status: isDbConnected ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
    },
  });
});

// 6. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

// 7. Catch-all 404 Handler
app.use(notFoundHandler);

// 8. Global Error Handling Middleware
app.use(errorHandler);

export default app;
