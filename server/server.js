import dotenv from 'dotenv';
import app from './src/app.js';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Mock Interview Server running on port ${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});
