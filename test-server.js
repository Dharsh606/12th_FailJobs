const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(PORT, 'localhost', () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('📍 Open your browser to test the new CSS design');
});
