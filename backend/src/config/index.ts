import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ override: true });

export const config = {
  port: parseInt(process.env.PORT),
  mongoUri: process.env.MONGODB_URI,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR),
  maxFilesPerBatch: parseInt(process.env.MAX_FILES_PER_BATCH),
  tolerance: 0.05
};
