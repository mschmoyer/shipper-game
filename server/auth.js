
const express = require('express');
const router = express.Router();
const { db } = require('./database');

router.post('/create-account', (req, res) => {
  const { name, businessName, email, apiKey, apiSecret } = req.body;
  console.log('Creating account with:', { name, businessName, email, apiKey, apiSecret });
  db.run('INSERT INTO player (name, businessName, email, apiKey, apiSecret) VALUES (?, ?, ?, ?, ?)', [name, businessName, email, apiKey, apiSecret], function (err) {
    if (err) {
      console.error('Failed to create account:', err.message);
      res.status(500).json({ error: 'Failed to create account.' });
    } else {
      req.session.playerId = this.lastID;
      req.session.save((err) => {
        if (err) {
          console.error('Failed to save session:', err.message);
          res.status(500).json({ error: 'Failed to save session.' });
        } else {
          console.log('Account created successfully with playerId:', this.lastID);
          console.log('Session after save:', req.session);
          res.json({ success: true, playerId: this.lastID });
        }
      });
    }
  });
});

router.get('/check-session', (req, res) => {
  // console.log('Checking Session. Session=', req.session);
  if (req.session.playerId) {
    console.log('Session found for playerId:', req.session.playerId);
    res.json({ loggedIn: true });
  } else {
    console.log('No session found');
    res.json({ loggedIn: false });
  }
});

module.exports = router;