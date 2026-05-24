/**
 * Simple Express server to serve the dashboard frontend
 * 
 * This file provides a quick way to serve the dashboard during development.
 * For production, you may want to serve it through nginx or integrate it with your main backend.
 * 
 * Run: node serve.js
 * Then visit: http://localhost:3001
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for API calls to backend
app.use(cors());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Main route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback for any other routes - serve index.html (for client-side routing if needed later)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 Dashboard server running at http://localhost:${PORT}`);
    console.log(`📊 Make sure backend API is running at http://localhost:3000`);
});
