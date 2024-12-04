const express = require('express');
const router = express.Router();
const { dbGet } = require('./database');
const { generateInitialGameState } = require('./game_logic_files/game-logic');

router.post('/create-account', async (req, res) => {
  const { name, businessName } = req.body;
  const existingPlayer = await dbGet(
    'SELECT * FROM player WHERE business_name = $1',
    [businessName],
    'Failed to check existing player'
  );
  if (existingPlayer) {
    console.log('Business name already exists:', existingPlayer);
    return res.status(200).json({ success: false, error: 'Business name already exists. Please try another.' });
  }
  console.log('Creating account with:', { name, businessName });
  const playerId = await generateInitialGameState(name, businessName);
  
  req.session.playerId = playerId;
  req.session.save((err) => {
    if (err) {
      console.error('Failed to save session:', err.message);
      res.status(500).json({ error: 'Failed to save session.' });
    } else {
      console.log('Account created successfully with playerId:', playerId);
      console.log('Session after saving:', req.session);
      res.json({ success: true, playerId });
    }
  });
});

router.get('/check-session', (req, res) => {
  if (req.session.playerId) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;