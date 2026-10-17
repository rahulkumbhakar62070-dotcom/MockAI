import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend folder regardless of process.cwd()
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT || 5000;

/**
 * Start the application:
 * 1. Verify required security configuration (JWT_SECRET).
 * 2. Attempt MongoDB connection BEFORE starting the HTTP server.
 * 3. If MongoDB connection fails, display a clear error message and exit safely.
 * 4. Start listening on PORT only when database connection is successful.
 */
const startServer = async () => {
  console.log('--------------------------------------------------');
  console.log('🔄 Initializing AI Mock Interview Platform Backend...');
  console.log('--------------------------------------------------');

  // 1. Verify required security configuration
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    console.error('==================================================');
    console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET is not configured.');
    console.error('👉 The server cannot start without a secure JWT_SECRET.');
    console.error('💡 Please define JWT_SECRET in your backend/.env file.');
    console.error('💡 Example generator: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('==================================================');
    process.exit(1);
  }

  try {
    // 2. Connect to MongoDB first
    console.log('📡 Connecting to MongoDB Database...');
    await connectDB();

    // 3. Start Express server only after DB connects
    const server = app.listen(PORT, () => {
      console.log('==================================================');
      console.log(`🚀 Server successfully started on port: ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth Endpoints: /api/auth/register | /api/auth/login | /api/auth/me`);
      console.log(`🔗 Allowed Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log('==================================================');
    });

    // Handle graceful shutdown signals (Ctrl + C)
    const handleShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Gracefully closing server...`);
      server.close(() => {
        console.log('💤 Express HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (error) {
    console.error('==================================================');
    console.error('❌ CRITICAL ERROR: Could not establish MongoDB connection.');
    console.error(`Reason: ${error.message}`);
    console.error('👉 The server will not start without a valid database connection.');
    console.error('💡 Please verify your MONGODB_URI in backend/.env file.');
    console.error('==================================================');
    // Exit safely with non-zero exit code
    process.exit(1);
  }
};

startServer();
