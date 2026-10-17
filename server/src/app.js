import express from 'express';
import cors from 'cors';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Root test route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to AI Mock Interview Platform API',
    status: 'Running',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy and ready!',
    timestamp: new Date().toISOString()
  });
});

export default app;
