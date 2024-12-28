const express = require('express');
const router = express.Router();
const { dbGet } = require('./database');
const { GenerateBusinessName, CreateNewBusiness } = require('./game_logic_files/business-logic');

router.post('/create-account', async (req, res) => {
  // try {
    const { name, businessName } = req.body;

    const new_business_data = await CreateNewBusiness(name, businessName);
    if (!new_business_data) {
      console.log('Failed to create business with name:', businessName);
      return res.status(200).json({ 
        success: false, 
        error: 'Copyright infringement! (fake). A business with that name already exists. If the AI assistant generated the name, please try again.' 
      });
    }
    
    req.session.businessId = new_business_data.business_id;
    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session:', err.message);
        res.status(500).json({ error: 'Failed to save session.' });
      } else {
        console.log('Account created successfully with businessId:', new_business_data.business_id);
        res.json({ success: true, ...new_business_data });
      }
    });
  // } catch (error) {
  //   console.error('Error creating account:', error.message);
  //   res.status(500).json({ error: error.message });
  // }
});

router.get('/check-session', (req, res) => {
  try {
    if (req.session.businessId) {
      res.json({ loggedIn: true });
    } else {
      res.json({ loggedIn: false });
    }
  } catch (error) {
    console.error('Error checking session:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;