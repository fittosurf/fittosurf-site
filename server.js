const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
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
