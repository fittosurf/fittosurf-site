// Load environment variables from a local .env file in development.
// In production (Hostinger) the variables are provided by the host, and the
// missing .env file is simply a no-op — never throw if dotenv is absent.
try {
  require('dotenv').config();
} catch (_) {
  /* dotenv not installed (e.g. prod without dev deps) — env vars still read from process.env */
}

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

// Clean URL for the blog index (before static, which would redirect to /blog/).
app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// Subscribe a lead to the Brevo (Sendinblue) contact list.
app.post('/api/subscribe', async (req, res) => {
  const { prenom, email } = req.body || {};

  // Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof prenom !== 'string' || !prenom.trim()) {
    return res.status(400).json({ ok: false, error: 'Le prénom est requis.' });
  }
  if (typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return res.status(400).json({ ok: false, error: 'Adresse email invalide.' });
  }

  if (!process.env.BREVO_API_KEY || !process.env.BREVO_LIST_ID) {
    console.error('[subscribe] Missing BREVO_API_KEY or BREVO_LIST_ID env var.');
    return res.status(500).json({ ok: false, error: 'Service momentanément indisponible.' });
  }

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        attributes: { PRENOM: prenom.trim() },
        listIds: [Number(process.env.BREVO_LIST_ID)],
        updateEnabled: true,
      }),
    });

    // 201 Created (new contact) or 204 No Content (updated) → success.
    if (brevoRes.status === 201 || brevoRes.status === 204) {
      return res.json({ ok: true });
    }

    // Read the response body once: try JSON, fall back to raw text.
    const rawBody = await brevoRes.text();
    let payload = null;
    try {
      payload = JSON.parse(rawBody);
    } catch (_) {
      /* not JSON — keep rawBody for logging */
    }

    // Contact already exists: with updateEnabled this is a success from the
    // user's point of view; never surface an error for re-subscribing.
    if (brevoRes.status === 400 && payload && payload.code === 'duplicate_parameter') {
      return res.json({ ok: true });
    }

    // Any other status is an unexpected failure — log status + body server-side
    // only (never the API key). The client still gets a generic message.
    console.error(
      '[subscribe] Brevo error — status:',
      brevoRes.status,
      '— body:',
      payload !== null ? payload : rawBody
    );
    return res.status(500).json({ ok: false, error: 'Une erreur est survenue. Réessaie.' });
  } catch (err) {
    console.error('[subscribe] Request failed', err);
    return res.status(500).json({ ok: false, error: 'Une erreur est survenue. Réessaie.' });
  }
});

app.get('/mentions-legales', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mentions-legales.html'));
});

app.get('/blog/bras-lachent-rame-surf', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog', 'bras-lachent-rame-surf.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`FitToSurf running at http://localhost:${PORT}`);
  // Startup diagnostics — booleans only, never the key value itself.
  console.log(
    '[env] BREVO_API_KEY defined:',
    Boolean(process.env.BREVO_API_KEY),
    '(length:',
    (process.env.BREVO_API_KEY || '').length + ')'
  );
  console.log('[env] BREVO_LIST_ID defined:', Boolean(process.env.BREVO_LIST_ID));
});
