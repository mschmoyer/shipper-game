const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { client, pgSessionStore } = require('./database');
const authRoutes = require('./auth');
const { generateEndGameTextWithOpenAI } = require('./open-ai');

const gameLogic = require('./game_logic_files/game-logic');
const technologyLogic = require('./game_logic_files/technology-logic');
const productLogic = require('./game_logic_files/product-logic');
const shippingLogic = require('./game_logic_files/shipping-logic');
const businessLogic = require('./game_logic_files/business-logic');
const leaderboardLogic = require('./game_logic_files/leaderboard-logic');
const skillLogic = require('./game_logic_files/skill-logic');

const app = express();
const port = process.env.PORT || 5005;

// Middleware
app.use(cors({ 
  credentials: true, 
  origin: (origin, callback) => {
    callback(null, true);
  }
}));
app.use(express.json());
app.use(session({
  store: pgSessionStore,
  secret: 'AbbaDabbaDoobiePoo',
  resave: false,
  saveUninitialized: false,
}));

app.use('/api', authRoutes);

const withBusinessSession = (handler) => async (req, res) => {
  // try {
    if (!req.session.businessId) {
      return res.status(401).json({ error: 'No business session' });
    }
    await handler(req, res);
  // } catch (error) {
    // console.error('Error:', error.message);
    // res.status(500).json({ error: error.message });
  // }
};

app.get('/api/game-info', withBusinessSession(async (req, res) => {
  let business = await businessLogic.getBusinessInfo(req.session.businessId);
  if(!business) {
    req.session.destroy();
    return res.status(401).json({ error: 'No business found' });
  }

  const available_technologies = await technologyLogic.getAvailableTechnologies(req.session.businessId);
  const acquired_technologies = await technologyLogic.getAcquiredTechnologies(req.session.businessId);
  const technology = await technologyLogic.getAllTechnologyWithState(req.session.businessId);
  const active_order = await shippingLogic.getActiveOrder(req.session.businessId);
  const product = await productLogic.getActiveProduct(business);
  const allProducts = await productLogic.getActiveProducts(business);
  const inventory = product.on_hand;

  const gData = await gameLogic.gameTick(business, allProducts, active_order);
  if(business.active && gData.game_status !== 'active') {
    business.expiration_reason=gData.game_status;
  }

  // now get an updated business object after everything above is done. 
  business = await businessLogic.getBusinessInfo(req.session.businessId);

  res.json({
    active_order,
    game_active: business && business.active,
    game_status: gData.game_status,
    minigames_enabled: true,
    business,
    product,
    allProducts,
    inventory,
    orders: gData.orders,
    secondsUntilNextOrder: gData.secondsUntilNextOrder,
    timeRemaining: Math.round(gData.timeRemainingSeconds),
    productsBuilt: gData.productsBuilt,
    ordersShipped: gData.ordersShipped,
    available_technologies,
    acquired_technologies,
    technology
  });
}));

app.post('/api/ship-order', withBusinessSession(async (req, res) => {
  const business = await businessLogic.getBusinessInfo(req.session.businessId);
  const result = await shippingLogic.shipOrder(business);
  if (result.error) {
    return res.status(200).json({ error: result.error });
  }

  res.json(result);
}));

app.post('/api/build-product', withBusinessSession(async (req, res) => {
  const { productId } = req.body;
  const result = await productLogic.startProductBuild(req.session.businessId, productId);
  if (result.error) {
    return res.status(200).json({ error: result.error });
  }
  res.json(result);
}));

app.post('/api/purchase-technology', withBusinessSession(async (req, res) => {
  const { techId } = req.body;

  const result = await technologyLogic.purchaseTechnology(req.session.businessId, techId);
  if (!result.success) {
    return res.json(result);
  }
  res.json(result);
}));

app.post('/api/reset-business', withBusinessSession(async (req, res) => {
  const businessId = req.session.businessId || req.headers['x-business-id'];

  if (!businessId) {
    return res.status(401).json({ error: 'No business session' });
  }

  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to reset business session' });
    }
    res.json({ success: true });
  });
}));

app.post('/api/end-game', withBusinessSession(async (req, res) => {
  const business = await businessLogic.getBusinessInfo(req.session.businessId);
  if (!business) {
    return res.status(401).json({ error: 'No business found' });
  }

  await businessLogic.expireBusiness(business, 'walked_away');
}));

app.post('/api/complete-truck-to-warehouse-game', withBusinessSession(async (req, res) => {
  const { succeeded } = req.body;
  await gameLogic.handleTruckToWarehouseGameCompletion(req.session.businessId, succeeded);
  res.json({ success: true });
}));

app.post('/api/complete-find-the-product-haystack-game', withBusinessSession(async (req, res) => {
  const { succeeded } = req.body;
  await gameLogic.handleFindTheProductHaystackGameCompletion(req.session.businessId, succeeded);
  res.json({ success: true });
}));

app.post('/api/upgrade-skill', withBusinessSession(async (req, res) => {
  const { skill } = req.body;

  const result = await skillLogic.upgradeSkill(req.session.businessId, skill);
  if (!result.success) {
    return res.json(result);
  }
  res.json(result);
}));

app.post('/api/generate-end-game-text', withBusinessSession(async (req, res) => {
  const endGameText = await generateEndGameTextWithOpenAI(req.session.businessId);
  res.json({ endGameText });
}));

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboardData = await leaderboardLogic.getLeaderboardData();
    res.json(leaderboardData);
  } catch (error) {
    console.error('Error retrieving leaderboard data:', error.message);
    res.status(500).json({ error: 'Failed to retrieve leaderboard data' });
  }
});

app.get('/api/network-data', async (req, res) => {
  try {
    const networkData = await businessLogic.getNetworkData();
    res.json(networkData);
  } catch (error) {
    console.error('Error retrieving network data:', error.message);
    res.status(500).json({ error: 'Failed to retrieve network data' });
  }
});

// Serve the React frontend
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Close the database on exit
process.on('SIGINT', () => {
  client.end(err => {
    if (err) {
      console.error('Failed to close the database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});