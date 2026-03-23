const express = require('express');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 46443;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://aarnavsingh836:Cucumber1729@rr.oldse8x.mongodb.net/matgate?retryWrites=true&w=majority';
const publicDir = path.join(__dirname, '..', 'public');
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'mydomain.key'), 'utf8'),
  cert: fs.readFileSync(
    path.join(__dirname, 'certs', 'd466aacf3db3f299.crt'),
    'utf8'
  ),
  ca: fs.readFileSync(
    path.join(__dirname, 'certs', 'gd_bundle-g2-g1.crt'),
    'utf8'
  ),
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(publicDir));

// Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/materials', require('../routes/materials'));
app.use('/api/issuances', require('../routes/issuances'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Connect to MongoDB and start
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB (matgate)');
    // Auto-setup default users
    const User = require('../models/User');
    const count = await User.countDocuments();
    if (count === 0) {
      await User.create([
        { username: 'stores', password: 'stores123', name: 'Stores Team', role: 'stores' },
        { username: 'production', password: 'prod123', name: 'Production Team', role: 'production' },
        { username: 'admin', password: 'admin123', name: 'Administrator', role: 'admin' }
      ]);
      console.log('✅ Default users created: stores/stores123, production/prod123, admin/admin123');
    }
    https
      .createServer(httpsOptions, app)
      .listen(PORT, () => console.log(`🚀 MatGate running at https://localhost:${PORT}`));
  })
  .catch(err => { console.error('❌ MongoDB connection failed:', err.message); process.exit(1); });
