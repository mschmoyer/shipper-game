const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { client, pgSessionStore } = require('./database');
const authRoutes = require('./auth');

const { gameTick, handleTruckToWarehouseGameCompletion, handleFindTheProductHaystackGameCompletion } = require('./game_logic_files/game-logic');
const { getAllTechnologyWithState, getAvailableTechnologies, getAcquiredTechnologies, purchaseTechnology } = require('./game_logic_files/technology-logic');
const { getActiveProduct, getInventoryInfo, startProductBuild } = require('./game_logic_files/product-logic');
const { shipOrder, getActiveOrder } = require('./game_logic_files/shipping-logic');
const { getPlayerInfo, expirePlayer, upgradeSkill, toggleBuildingAutomation } = require('./game_logic_files/player-logic'); // Import the upgradeSkill and toggleBuildingAutomation functions
const { getLeaderboardData } = require('./game_logic_files/leaderboard-logic');

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

app.get('/api/game-info', async (req, res) => {
  if (!req.session.playerId) {
    // console.log('Unauthorized access to game-info');
    return res.status(401).json({ error: 'No player session' });
  }

  const player = await getPlayerInfo(req.session.playerId);
  if(!player) {
    // kill the session if the player is not found
    // console.log('No player found for session:', req.session);
    req.session.destroy();
    return res.status(401).json({ error: 'No player found' });
  }

  const available_technologies = await getAvailableTechnologies(req.session.playerId);
  const acquired_technologies = await getAcquiredTechnologies(req.session.playerId);
  const technology = await getAllTechnologyWithState(req.session.playerId);

  const active_order = await getActiveOrder(req.session.playerId);

  const product = await getActiveProduct(req.session.playerId);

  const inventory = await getInventoryInfo(req.session.playerId);

  // This moves the game along
  const gData = await gameTick(player, product, inventory);
  
  const progress = active_order ? Math.min((active_order.elapsed_time / active_order.duration) * 100, 100) : 100;
  
  const is_shipping = active_order ? progress < 100 : false;

  res.json({
    active_order,
    game_active: player && player.active,
    game_status: gData.game_status,
    minigames_enabled: false,
    player,
    progress,
    is_shipping,
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
});

app.post('/api/ship-order', async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }

  const result = await shipOrder(req.session.playerId);
  if (result.error) {
    return res.status(200).json({ error: result.error });
  }

  res.json(result);
});

app.post('/api/build-product', async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }

  const result = await startProductBuild(req.session.playerId);
  if (result.error) {
    return res.status(200).json({ error: result.error });
  }
  res.json(result);
});

app.post('/api/purchase-technology', async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }
  const { techId } = req.body;

  const result = await purchaseTechnology(req.session.playerId, techId);
  if (!result.success) {
    return res.json(result);
  }
  res.json(result);
});

app.post('/api/reset-player', async (req, res) => {
  // if session playerid is null, use x-player-id header
  const playerId = req.session.playerId || req.headers['x-player-id'];

  if (!playerId) {
    return res.status(401).json({ error: 'No player session' });
  }

  const player = await getPlayerInfo(playerId);
  await expirePlayer(player);
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to reset player session' });
    }
    res.json({ success: true });
  });
});

app.post('/api/complete-truck-to-warehouse-game', async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }
  const { succeeded } = req.body;
  await handleTruckToWarehouseGameCompletion(req.session.playerId, succeeded);
  res.json({ success: true });
});

app.post('/api/complete-find-the-product-haystack-game', async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }
  const { succeeded } = req.body;
  await handleFindTheProductHaystackGameCompletion(req.session.playerId, succeeded);
  res.json({ success: true });
});

app.post('/api/upgrade-skill', async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }
  const { skill } = req.body;

  const result = await upgradeSkill(req.session.playerId, skill);
  if (!result.success) {
    return res.json(result);
  }
  res.json(result);
});

app.post('/api/toggle-building-automation', async (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }

  const result = await toggleBuildingAutomation(req.session.playerId);
  res.json({ new_value: result });
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboardData = await getLeaderboardData();
    res.json(leaderboardData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve leaderboard data' });
  }
});

// Serve the React frontend
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  console.log('Serving index.html');
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