import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config/index.js';

async function startServer() {
  try {
    console.log(`Connecting to MongoDB at: ${config.mongoUri}`);
    await mongoose.connect(config.mongoUri);
    console.log('Successfully connected to MongoDB.');

    app.listen(config.port, () => {
      console.log(`=================================================`);
      console.log(` Invoice Intelligence Server running on port ${config.port}`);
      console.log(` Health Check: http://localhost:${config.port}/api/v1/health`);
      console.log(` Gemini API Configured: ${config.geminiApiKey ? 'YES' : 'NO'}`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Handle unexpected termination gracefully
process.on('SIGINT', async () => {
  await mongoose.disconnect();
  console.log('MongoDB disconnected on process exit.');
  process.exit(0);
});

startServer();
