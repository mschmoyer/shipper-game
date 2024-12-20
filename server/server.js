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
const playerLogic = require('./game_logic_files/player-logic');
const leaderboardLogic = require('./game_logic_files/leaderboard-logic');

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

const withPlayerSession = (handler) => async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }
    await handler(req, res);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

app.get('/api/game-info', withPlayerSession(async (req, res) => {
  let player = await playerLogic.getPlayerInfo(req.session.playerId);
  if(!player) {
    req.session.destroy();
    return res.status(401).json({ error: 'No player found' });
  }

  const available_technologies = await technologyLogic.getAvailableTechnologies(req.session.playerId);
  const acquired_technologies = await technologyLogic.getAcquiredTechnologies(req.session.playerId);
  const technology = await technologyLogic.getAllTechnologyWithState(req.session.playerId);
  const active_order = await shippingLogic.getActiveOrder(req.session.playerId);
  const product = await productLogic.getActiveProduct(player);
  const inventory = await productLogic.getInventoryInfo(req.session.playerId);

  const gData = await gameLogic.gameTick(player, product, inventory, active_order);
  if(player.active && gData.game_status !== 'active') {
    player.expiration_reason=gData.game_status;
  }

  // now get an updated player object after everything above is done. 
  player = await playerLogic.getPlayerInfo(req.session.playerId);

  res.json({
    active_order,
    game_active: player && player.active,
    game_status: gData.game_status,
    minigames_enabled: true,
    player,
    product,
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

app.post('/api/ship-order', withPlayerSession(async (req, res) => {
  const player = await playerLogic.getPlayerInfo(req.session.playerId);
  const result = await shippingLogic.shipOrder(player);
  if (result.error) {
    return res.status(200).json({ error: result.error });
  }

  res.json(result);
}));

app.post('/api/build-product', withPlayerSession(async (req, res) => {
  const result = await productLogic.startProductBuild(req.session.playerId);
  if (result.error) {
    return res.status(200).json({ error: result.error });
  }
  res.json(result);
}));

app.post('/api/purchase-technology', withPlayerSession(async (req, res) => {
  const { techId } = req.body;

  const result = await technologyLogic.purchaseTechnology(req.session.playerId, techId);
  if (!result.success) {
    return res.json(result);
  }
  res.json(result);
}));

app.post('/api/reset-player', withPlayerSession(async (req, res) => {
  const playerId = req.session.playerId || req.headers['x-player-id'];

  if (!playerId) {
    return res.status(401).json({ error: 'No player session' });
  }

  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to reset player session' });
    }
    res.json({ success: true });
  });
}));

app.post('/api/end-game', withPlayerSession(async (req, res) => {
  const player = await playerLogic.getPlayerInfo(req.session.playerId);
  if (!player) {
    return res.status(401).json({ error: 'No player found' });
  }

  await playerLogic.expirePlayer(player, 'walked_away');
}));

app.post('/api/complete-truck-to-warehouse-game', withPlayerSession(async (req, res) => {
  const { succeeded } = req.body;
  await gameLogic.handleTruckToWarehouseGameCompletion(req.session.playerId, succeeded);
  res.json({ success: true });
}));

app.post('/api/complete-find-the-product-haystack-game', withPlayerSession(async (req, res) => {
  const { succeeded } = req.body;
  await gameLogic.handleFindTheProductHaystackGameCompletion(req.session.playerId, succeeded);
  res.json({ success: true });
}));

app.post('/api/upgrade-skill', withPlayerSession(async (req, res) => {
  const { skill } = req.body;

  const result = await playerLogic.upgradeSkill(req.session.playerId, skill);
  if (!result.success) {
    return res.json(result);
  }
  res.json(result);
}));

app.post('/api/generate-end-game-text', withPlayerSession(async (req, res) => {
  const endGameText = await generateEndGameTextWithOpenAI(req.session.playerId);
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
    const networkData = await playerLogic.getNetworkData();
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