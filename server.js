const express = require('express');
const connectDB = require('./config/database');
const cors = require('cors');


const app = express();

// Connect to Database
connectDB();

// Enable CORS
app.use(cors());

// Init Middleware
app.use(express.json({ extended: false }));

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/predictions', require('./routes/predictions')); 

const PORT = process.env.PORT || 8081;

app.listen(8081, () => console.log('Server started on port 8081'));