import { Request, Response } from "express";
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import fileUpload from 'express-fileupload';
import authRoutes from './routes/auth';
import businessRoutes from './routes/business';
import contentRoutes from './routes/content';

import { connectToDocumentDB } from './config/connect';



const app = express();
const port = process.env.PORT || 4000;

app.use(cors()); // Allow all origins

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
  createParentPath: true,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  abortOnLimit: true,
  responseOnLimit: "File size limit has been reached",
}));

app.use('/api', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/content', contentRoutes);


// Connect to the database
connectToDocumentDB()
  .then(() => console.log('DB connected'))
  .catch((err: Error) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from the API!');
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});