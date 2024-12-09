const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { client, pgSessionStore } = require('./database');
const authRoutes = require('./auth');
const { generateEndGameTextWithOpenAI } = require('./open-ai');

const { gameTick, handleTruckToWarehouseGameCompletion, handleFindTheProductHaystackGameCompletion } = require('./game_logic_files/game-logic');
const { getAllTechnologyWithState, getAvailableTechnologies, getAcquiredTechnologies, purchaseTechnology } = require('./game_logic_files/technology-logic');
const { getActiveProduct, getInventoryInfo, startProductBuild } = require('./game_logic_files/product-logic');
const { shipOrder, getActiveOrder } = require('./game_logic_files/shipping-logic');
const { getPlayerInfo, expirePlayer, upgradeSkill, toggleBuildingAutomation, getNetworkData } = require('./game_logic_files/player-logic'); // Import the upgradeSkill and toggleBuildingAutomation functions
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
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }

    let player = await getPlayerInfo(req.session.playerId);
    if(!player) {
      req.session.destroy();
      return res.status(401).json({ error: 'No player found' });
    }

    const available_technologies = await getAvailableTechnologies(req.session.playerId);
    const acquired_technologies = await getAcquiredTechnologies(req.session.playerId);
    const technology = await getAllTechnologyWithState(req.session.playerId);
    const active_order = await getActiveOrder(req.session.playerId);
    const product = await getActiveProduct(player);
    const inventory = await getInventoryInfo(req.session.playerId);

    const gData = await gameTick(player, product, inventory, active_order);
    if(player.active && gData.game_status !== 'active') {
      player.expiration_reason=gData.game_status;
    }

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
  } catch (error) {
    console.error('Error fetching game info:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ship-order', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }
    const player = await getPlayerInfo(req.session.playerId);
    const result = await shipOrder(player);
    if (result.error) {
      return res.status(200).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('Error shipping order:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/build-product', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }

    const result = await startProductBuild(req.session.playerId);
    if (result.error) {
      return res.status(200).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error building product:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/purchase-technology', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }
    const { techId } = req.body;

    const result = await purchaseTechnology(req.session.playerId, techId);
    if (!result.success) {
      return res.json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Error purchasing technology:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset-player', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error resetting player:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/end-game', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }

    const player = await getPlayerInfo(req.session.playerId);
    if (!player) {
      return res.status(401).json({ error: 'No player found' });
    }

    await expirePlayer(player, 'walked_away');
  } catch (error) {
    console.error('Error ending game:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/complete-truck-to-warehouse-game', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }
    const { succeeded } = req.body;
    await handleTruckToWarehouseGameCompletion(req.session.playerId, succeeded);
    res.json({ success: true });
  } catch (error) {
    console.error('Error completing truck to warehouse game:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/complete-find-the-product-haystack-game', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }
    const { succeeded } = req.body;
    await handleFindTheProductHaystackGameCompletion(req.session.playerId, succeeded);
    res.json({ success: true });
  } catch (error) {
    console.error('Error completing find the product haystack game:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upgrade-skill', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }
    const { skill } = req.body;

    const result = await upgradeSkill(req.session.playerId, skill);
    if (!result.success) {
      return res.json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Error upgrading skill:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/toggle-building-automation', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }

    const result = await toggleBuildingAutomation(req.session.playerId);
    res.json({ new_value: result });
  } catch (error) {
    console.error('Error toggling building automation:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-end-game-text', async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: 'No player session' });
    }

    const endGameText = await generateEndGameTextWithOpenAI(req.session.playerId);
    res.json({ endGameText });
  } catch (error) {
    console.error('Error generating end game text:', error.message);
    res.status(500).json({ error: 'Failed to generate end-game text' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboardData = await getLeaderboardData();
    res.json(leaderboardData);
  } catch (error) {
    console.error('Error retrieving leaderboard data:', error.message);
    res.status(500).json({ error: 'Failed to retrieve leaderboard data' });
  }
});

app.get('/api/network-data', async (req, res) => {
  try {
    const networkData = await getNetworkData();
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