const express = require('express');
const router = express.Router();
const { dbGet } = require('./database');
const { GenerateBusinessName, CreateNewPlayer } = require('./game_logic_files/player-logic');

router.post('/create-account', async (req, res) => {
  const { name, businessName } = req.body;

  const playerId = await CreateNewPlayer(name, businessName);
  if (!playerId) {
    console.log('Failed to create business with name:', businessName);
    return res.status(200).json({ 
      success: false, 
      error: 'Copyright infringement! (fake). A business with that name already exists. If the AI assistant generated the name, please try again.' 
    });
  }
  
  req.session.playerId = playerId;
  req.session.save((err) => {
    if (err) {
      console.error('Failed to save session:', err.message);
      res.status(500).json({ error: 'Failed to save session.' });
    } else {
      console.log('Account created successfully with playerId:', playerId);
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