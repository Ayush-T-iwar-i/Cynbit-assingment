require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Lead = require('./models/Lead');

const app = express();
app.use(helmet({ contentSecurityPolicy: { directives: {
  ...helmet.contentSecurityPolicy.getDefaultDirectives(),
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com']
} } }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'));
app.get('/contact', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'index.html')));

const submitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s-]{6,18}$/;

function validate(b) {
  const errors = {};
  if (!b.name || b.name.trim().length < 2) errors.name = 'Enter your full name.';
  if (!b.email || !EMAIL_RE.test(b.email.trim())) errors.email = 'Enter a valid email address.';
  if (!b.message || b.message.trim().length < 10) errors.message = 'Tell us a bit more (at least 10 characters).';
  return errors;
}

app.post('/api/leads', submitLimiter, async (req, res) => {
  // Honeypot: bots fill this hidden field, humans never see it
  if (req.body.website) return res.status(201).json({ ok: true });
  const errors = validate(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });
  try {
    const { name, email, company, industry, message } = req.body;
    await Lead.create({ name, email, company, industry, message });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Could not save your request. Please try again.' });
  }
});

function adminAuth(req, res, next) {
  const key = req.get('x-admin-key') || '';
  const expected = process.env.ADMIN_KEY || '';
  const a = Buffer.from(key), b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid admin key.' });
  }
  next();
}

app.get('/api/leads', adminAuth, async (req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(leads);
});

app.patch('/api/leads/:id', adminAuth, async (req, res) => {
  const { status } = req.body;
  if (!['new', 'contacted', 'closed'].includes(status)) return res.status(400).json({ error: 'Bad status.' });
  const lead = await Lead.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  res.json(lead);
});

const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(port, () => console.log(`Running on http://localhost:${port}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });