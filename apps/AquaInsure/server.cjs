const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;
const DIST = path.join(__dirname, 'dist');

// Serve static files under /aquainsure/
app.use('/aquainsure', express.static(DIST));

// SPA fallback: any route under /aquainsure that doesn't match a file -> index.html
app.use('/aquainsure', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// Redirect root to /aquainsure/
app.use('/', (req, res) => {
  res.redirect('/aquainsure/');
});

app.listen(PORT, () => {
  console.log(`Frontend serving on port ${PORT}`);
});
