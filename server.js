const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Force HTTPS in production (behind Hostinger's reverse proxy).
// Detect the original protocol via the 'x-forwarded-proto' header set by the proxy.
// When the header is absent (e.g. local http://localhost dev), do nothing.
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
  }
  next();
});

app.use(express.json());

// Keep /downloads/ files publicly downloadable by direct link, but tell
// crawlers not to index or follow them. Placed before static serving so the
// header is applied when express.static returns the file.
app.use('/downloads', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/lead', (req, res) => {
  const { firstName, email } = req.body || {};

  if (!firstName || !email) {
    return res.status(400).json({ ok: false, error: 'Prénom et email requis.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: 'Email invalide.' });
  }

  console.log(`[lead] ${firstName} <${email}>`);
  res.json({ ok: true });
});

app.get('/mentions-legales', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mentions-legales.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`FitToSurf running at http://localhost:${PORT}`);
});
