const express = require('express');
const router = express.Router();
const { dbRun } = require('./database');
const { generateInitialGameState } = require('./game-logic');

router.post('/create-account', async (req, res) => {
  const { name, businessName, email, apiKey, apiSecret } = req.body;
  console.log('Creating account with:', { name, businessName, email, apiKey, apiSecret });
  try {
    const playerId = await generateInitialGameState(name, businessName, email, apiKey, apiSecret);
    req.session.playerId = playerId;
    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session:', err.message);
        res.status(500).json({ error: 'Failed to save session.' });
      } else {
        console.log('Account created successfully with playerId:', playerId);
        console.log('Session after save:', req.session);
        res.json({ success: true, playerId });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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