import { Request, Response } from "express";

require('dotenv').config();
const express = require('express');
const { connectToDocumentDB } = require('./config/connect');
const cors = require('cors');
const app = express();
const port = 3000;

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

app.use(cors()); // Allow all origins

// Middleware
app.use(express.json());

app.use('/fhir/v1/auth', authRoutes);
app.use('/fhir/v1', adminRoutes);

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