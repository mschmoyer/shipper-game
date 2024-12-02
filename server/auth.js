const express = require('express');
const router = express.Router();
const { dbGet } = require('./database');
const { generateInitialGameState } = require('./game-logic');

router.post('/create-account', async (req, res) => {
  const { name, businessName, email, apiKey, apiSecret } = req.body;
  const existingPlayer = await dbGet(
    'SELECT * FROM player WHERE businessName = ?',
    [businessName],
    'Failed to check existing player'
  );
  if (existingPlayer) {
    console.log('Business name already exists:', existingPlayer);
    return res.status(200).json({ success: false, error: 'Business name already exists. Please try another.' });
  }
  console.log('Creating account with:', { name, businessName, email, apiKey, apiSecret });
  const playerId = await generateInitialGameState(name, businessName, email, apiKey, apiSecret);
  
  console.log('Generated playerId:', playerId); // Debugging statement
  req.session.playerId = playerId;
  console.log('Session after setting playerId:', req.session); // Debugging statement

  console.log('Session before save:', req.session); // Debugging statement
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
});

router.get('/check-session', (req, res) => {
  console.log('Checking Session. Session=', req.session);
  if (req.session.playerId) {
    console.log('Session found for playerId:', req.session.playerId);
    res.json({ loggedIn: true });
  } else {
    console.log('No session found');
    res.json({ loggedIn: false });
  }
});

module.exports = router;