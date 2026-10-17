import mongoose from 'mongoose';

/**
 * Connect to MongoDB using Mongoose
 * Reads MONGODB_URI from environment variables.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in your environment variables (.env file).');
    console.error('👉 Please configure MONGODB_URI in backend/.env to connect to MongoDB.');
    throw new Error('MONGODB_URI environment variable is missing.');
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    console.log(`📦 Database Name: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Re-throw so the caller (server.js) can handle graceful exit
    throw error;
  }
};

export default connectDB;
