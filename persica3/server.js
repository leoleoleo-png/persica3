// Local dev server — serves public/ as static files
// In production, deploy public/ to Netlify (no server needed)

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`\nPERSICA 3 dev server → http://localhost:${PORT}\n`);
});
