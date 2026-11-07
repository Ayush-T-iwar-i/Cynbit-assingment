require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const app = require('./api');

// On some networks (common on Windows) the system DNS cannot resolve mongodb+srv:// addresses.
// Public DNS servers fix "querySrv ECONNREFUSED" errors.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(port, () => console.log(`Running on http://localhost:${port}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });