const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { db, dbRun, dbGet, dbAll } = require('./database');
const authRoutes = require('./auth');
const { calculateShippingAndBuyLabel, playerHasTechnology, getShippingSteps, makeNewTechnologyAvailable, gameTick, CalculatePlayerReputation, expirePlayer } = require('./game-logic');
const SQLiteStore = require('connect-sqlite3')(session);
const { OrderStates } = require('./constants');
const { getActiveProduct, getInventoryInfo, startProductBuild } = require('./product-logic'); // Import from product-logic.js

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
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    httpOnly: true,
    sameSite: 'none',
  }
}));

app.use((req, res, next) => {
  console.log('Cookies:', req.cookies); // Debugging statement
  console.log('Session in middleware:', req.session); // Debugging statement
  next();
});

app.use('/api', authRoutes);

app.get('/api/game-info', async (req, res) => {
  console.log('Checking Session in /api/game-info. Session=', req.session); // Debugging statement
  if (!req.session.playerId) {
    console.log('Unauthorized access to game-info');
    return res.status(401).json({ error: 'No player session' });
  }
  try {
    const player = await dbGet(
      `SELECT *, 
      (strftime('%s', 'now') - strftime('%s', createdAt)) AS elapsedTime
       FROM player 
       WHERE id = ?`,
      [req.session.playerId],
      'Failed to retrieve game info'
    );

    const availableTechnologies = await dbAll(
      'SELECT * FROM available_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ?',
      [req.session.playerId],
      'Failed to retrieve available technologies'
    );

    const acquiredTechnologies = await dbAll(
      'SELECT * FROM acquired_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ?',
      [req.session.playerId],
      'Failed to retrieve acquired technologies'
    );

    if (!player.active) {
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
      ...player,
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
  } catch (err) {
    console.error('Error in /api/game-info:', err); // Debugging statement
    req.session.destroy(error => {
      if (error) {
        return res.status(500).json({ error: 'Failed to reset player session' });
      }
      res.status(500).json({ error: err.message });
    });
  }
});

app.post('/api/start-shipping', async (req, res) => {
  console.log('Checking Session in /api/start-shipping. Session=', req.session); // Debugging statement
  if (!req.session.playerId) {
    console.log('Unauthorized access to start-shipping');
    return res.status(401).json({ error: 'No player session' });
  }

  try {
    let activeOrder = await dbGet(
      `SELECT * FROM orders 
       WHERE active=true and playerId = ? 
       AND state = ?`,
      [req.session.playerId, OrderStates.InProgress],
      'Failed to check active orders'
    );

    if (activeOrder) {
      console.log('An active order is still in progress');
      return res.status(400).json({ error: 'An active order is still in progress' });
    } else {
      const hasOrderGridFilters = await playerHasTechnology(req.session.playerId, 'order_grid_filters');
      if (hasOrderGridFilters) {
        activeOrder = await dbGet(
        `SELECT * FROM orders 
        WHERE active=true and playerId = ? 
        AND state = ?
        ORDER BY dueByTime ASC
        LIMIT 1`,
        [req.session.playerId, OrderStates.AwaitingShipment],
        'Failed to check active orders'
        );
      } else {
        // The poor player is suffering without proper order prioritization...
        activeOrder = await dbGet(
        `SELECT * FROM orders 
        WHERE active=true and playerId = ? 
        AND state = ?
        ORDER BY RANDOM()
        LIMIT 1`,
        [req.session.playerId, OrderStates.AwaitingShipment],
        'Failed to check active orders'
        );
      }
    }

    console.log('activeOrder:', activeOrder); // Debugging statement

    // check inventory
    const inventory = await getInventoryInfo(req.session.playerId);
    // if not enough inventory, fail with an error message
    if (inventory[0].onHand <= 0) {
      return res.status(200).json({ error: 'Not enough inventory to fulfill the order' });
    }

    const { steps: shippingSteps, totalDuration: baseShippingDuration } = await getShippingSteps(req.session.playerId);
    let shippingDuration = baseShippingDuration;
    console.log('Start Shipping - Base Shipping Duration:', baseShippingDuration); // Debugging statement

    const { shippingCost, salesPrice } = await calculateShippingAndBuyLabel(req.session.playerId, activeOrder.distance);

    console.log('Start Shipping - Shipping Cost:', shippingCost); // Debugging statement

    // Update the duration and state of the order
    await dbRun(
      'UPDATE orders SET duration = ?, state = ?, startTime = ?, shippingCost = ? WHERE id = ?',
      [shippingDuration, OrderStates.InProgress, new Date().toISOString(), shippingCost, activeOrder.id],
      'Failed to update order duration, state, start time, and shipping cost'
    );

    await dbRun(
      'UPDATE player SET isShipping = 1, progress = 0 WHERE id = ?',
      [req.session.playerId],
      'Failed to update shipping status'
    );
    console.log('Shipping started successfully');
    res.json({ 
      message: 'Shipping started successfully.',
      shippingDuration,
      shippingSteps, // Use shippingSteps instead of shippingStates
      shippingCost,
      salesPrice,
      order: activeOrder // Include the active order data in the response
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchase-technology', async (req, res) => {
  console.log('Checking Session in /api/purchase-technology. Session=', req.session); // Debugging statement
  if (!req.session.playerId) {
    console.log('Unauthorized access to purchase-technology');
    return res.status(401).json({ error: 'No player session' });
  }
  const { techId, cost } = req.body;
  const acquiredDate = new Date().toISOString();
  try {
    const player = await dbGet(
      'SELECT money FROM player WHERE id = ?',
      [req.session.playerId],
      'Failed to retrieve player money'
    );
    if (player.money < cost) {
      return res.json({ success: false, message: 'Not enough money to purchase technology.' });
    }
    const technology = await dbGet(
      'SELECT techCode, acquirable FROM technologies WHERE id = ?',
      [techId],
      'Failed to retrieve technology info'
    );
    if (technology.acquirable) {
      await dbRun(
        'INSERT INTO acquired_technologies (playerId, techId, acquiredDate, acquiredCost) VALUES (?, ?, ?, ?)',
        [req.session.playerId, techId, acquiredDate, cost],
        'Failed to purchase technology'
      );
    } else {
      performOneTimeTechnologyEffect(req.session.playerId, technology.techCode);
    }
    await dbRun(
      'UPDATE player SET money = money - ?, techLevel = techLevel + 1 WHERE id = ?',
      [cost, req.session.playerId],
      'Failed to update player money and tech level'
    );
    await dbRun(
      'DELETE FROM available_technologies WHERE playerId = ? AND techId = ?',
      [req.session.playerId, techId],
      'Failed to remove technology from available technologies'
    );
    const newTechAdded = await makeNewTechnologyAvailable(req.session.playerId);
    if (newTechAdded) {
      console.log('A new technology was made available for playerId', req.session.playerId);
    } else {
      console.log('No new technology available for playerId', req.session.playerId);
    }
    res.json({ success: true, message: 'Technology purchased successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset-player', async (req, res) => {
  console.log('Checking Session in /api/reset-player. Session=', req.session); // Debugging statement
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No player session' });
  }

  try {
    await expirePlayer(req.session.playerId);
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ error: 'Failed to reset player session' });
      }
      res.json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/build-product', async (req, res) => {
  console.log('Checking Session in /api/build-product. Session=', req.session); // Debugging statement
  if (!req.session.playerId) {
    console.log('Unauthorized access to build-product');
    return res.status(401).json({ error: 'No player session' });
  }

  try {
    const result = await startProductBuild(req.session.playerId);
    if (result.error) {
      return res.status(200).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('Error in /api/build-product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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