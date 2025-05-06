require('dotenv').config();
const express = require('express');
const { connectToDocumentDB } = require('./config/connect');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const app = express();
const port = 8000;

app.use(cors()); // Allow all origins

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

app.use(express.json());
app.use('/fhir/v1/auth', authRoutes);
app.use('/fhir/v1', adminRoutes);

// Connect to the database
connectToDocumentDB()
  .then(() => console.log('DB connected'))
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

app.post('/data', (req, res) => {
  console.log(req.body);
  res.json({ message: 'Data received', data: req.body });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});