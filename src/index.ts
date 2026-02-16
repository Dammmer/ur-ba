import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { apiLimiter } from './middlewares/rateLimiter';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import courseRoutes from './routes/course';
import userRoutes from './routes/user';
import eventRoutes from './routes/event';
import postRoutes from './routes/post';
import lessonRoutes from './routes/lesson';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
// Global rate limiter
app.use(apiLimiter);
app.use(express.urlencoded({ limit: "10mb", extended: true }));





app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lessons', lessonRoutes);

app.get('/', (req, res) => {
  res.send('Uyghur Connect Backend API');
});

mongoose.connect(process.env.MONGO_URI || '', {
  dbName: 'uyghur_connect',
}).then(() => {
  console.log('MongoDB connected successfully');
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
  if (err.message.includes('TLS')) {
    console.error('TLS/SSL connection error. Please check:');
    console.error('1. MongoDB Atlas credentials are correct');
    console.error('2. Network allows connection to MongoDB Atlas');
    console.error('3. MongoDB Atlas cluster is running');
  }
  process.exit(1);
});
