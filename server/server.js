const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { db, dbGet, dbAll } = require('./database');
const authRoutes = require('./auth');
const SQLiteStore = require('connect-sqlite3')(session);
const { OrderStates } = require('./constants');

const { gameTick, CalculatePlayerReputation, expirePlayer } = require('./game_logic_files/game-logic');
const { getAvailableTechnologies, getAcquiredTechnologies, purchaseTechnology } = require('./game_logic_files/technology-logic');
const { getActiveProduct, getInventoryInfo, startProductBuild } = require('./game_logic_files/product-logic');
const { getShippingSteps, shipOrder } = require('./game_logic_files/shipping-logic');
const { getPlayerInfo } = require('./game_logic_files/player-logic');

const app = express();
const port = 5005;

// Middleware
app.use(cors({ 
  credentials: true, 
  origin: (origin, callback) => {
    if (origin && (origin.includes('localhost:3000') || origin.endsWith('.ngrok.app'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './database' }),
  secret: 'AbbaDabbaDoobiePoo',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: false
  }
}));

app.use('/api', authRoutes);

app.get('/api/game-info', async (req, res) => {
  if (!req.session.playerId) {
    console.log('Unauthorized access to game-info');
    return res.status(401).json({ error: 'No player session' });
  }

  const player = await getPlayerInfo(req.session.playerId);
  if(!player) {
    // kill the session if the player is not found
    req.session.destroy();
    return res.status(401).json({ error: 'No player found' });
  }

  const availableTechnologies = await getAvailableTechnologies(req.session.playerId);
  const acquiredTechnologies = await getAcquiredTechnologies(req.session.playerId);

  if (player && !player.active) {
    return res.json({ gameActive: false, player, orders: [], acquiredTechnologies});
  }

  const { secondsUntilNextOrder, timeRemainingSeconds } = await gameTick(req.session.playerId, player);

  const reputation = await CalculatePlayerReputation(req.session.playerId);
  player.reputation = reputation;

  const orderListOrders = await dbAll(
    `SELECT * FROM orders 
      WHERE playerId = ? 
      AND active = 1 
      AND state != ? 
      AND (state != ? OR (strftime('%s', 'now') - strftime('%s', dueByTime)) <= 60)
      LIMIT 100`,
    [req.session.playerId, OrderStates.Canceled, OrderStates.Shipped],
    'Failed to retrieve active orders'
  );

  const activeOrder = await dbGet(
    `SELECT * FROM orders 
      WHERE playerId = ? 
      AND active = 1 
      AND state = ? 
      LIMIT 1`,
    [req.session.playerId, OrderStates.InProgress],
    'Failed to retrieve active orders'
  );

  const { steps: shippingSteps, totalDuration: shippingDuration } = await getShippingSteps(req.session.playerId);
  const startTime = activeOrder ? new Date(activeOrder.startTime) : null;
  const currentTime = new Date();
  const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;
  const progress = activeOrder ? Math.min((elapsedTime / activeOrder.duration) * 100, 100) : 100;
  const isShipping = activeOrder ? progress < 100 : false;

  const product = await getActiveProduct(req.session.playerId);
  const inventory = await getInventoryInfo(req.session.playerId);

  res.json({
    gameActive: true,
    player,
    shippingSteps,
    shippingDuration,
    progress,
    isShipping,
    availableTechnologies,
    acquiredTechnologies,
    product,
    inventory,
    activeOrder,
    orders: orderListOrders,
    secondsUntilNextOrder,
    timeRemaining: Math.round(timeRemainingSeconds) // Round to nearest whole number
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
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }

  await expirePlayer(req.session.playerId);
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to reset player session' });
    }
    res.json({ success: true });
  });
});

app.get('/api/leaderboard', async (req, res) => {
  const ordersShipped = await dbAll(
    'SELECT name, businessName, ordersShipped FROM player ORDER BY ordersShipped DESC LIMIT 10',
    [],
    'Failed to retrieve orders shipped leaderboard'
  );

  const moneyEarned = await dbAll(
    'SELECT name, businessName, totalMoneyEarned FROM player ORDER BY totalMoneyEarned DESC LIMIT 10',
    [],
    'Failed to retrieve money earned leaderboard'
  );

  const techLevel = await dbAll(
    'SELECT name, businessName, techLevel FROM player ORDER BY techLevel DESC LIMIT 10',
    [],
    'Failed to retrieve tech level leaderboard'
  );

  res.json({ ordersShipped, moneyEarned, techLevel });
});

// Serve the React frontend
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Close the database on exit
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Failed to close the database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});