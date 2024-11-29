// Filename: server/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { db, initDatabase, dbRun, dbGet, dbAll } = require('./database');
const authRoutes = require('./auth');
const { OrderCompleted, calculateShippingAndBuyLabel, playerHasTechnology, getShippingSteps, makeNewTechnologyAvailable } = require('./game-logic');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const port = 5005;

// Middleware
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './database' }),
  secret: 'AbbaDabbaDoobiePoo',
  resave: false,
  saveUninitialized: false, // Change this to false to avoid creating sessions for unauthenticated users
  cookie: { secure: false, httpOnly: false } // Ensure the cookie is accessible from the client
}));

// // Debug logging middleware
// app.use((req, res, next) => {
//   console.log(`Received ${req.method} request for ${req.url}`);
//   console.log('Session:', req.session);
//   next();
// });

// Database setup
db.serialize(() => {
  initDatabase();
});

// API routes
app.use('/api', authRoutes);

app.get('/api/check-session', (req, res) => {
  // console.log('Checking Session. Session=', req.session);
  if (req.session.playerId) {
    console.log('Session found for playerId:', req.session.playerId);
    res.json({ loggedIn: true });
  } else {
    console.log('No session found');
    res.json({ loggedIn: false });
  }
});

app.get('/api/game-info', async (req, res) => {
  if (!req.session.playerId) {
    console.log('Unauthorized access to game-info');
    return res.status(401).json({ error: 'No player session' });
  }
  try {
    const gameInfo = await dbGet(
      'SELECT businessName, money, techPoints, techLevel, ordersShipped, totalMoneyEarned FROM player WHERE id = ?',
      [req.session.playerId],
      'Failed to retrieve game info'
    );
    gameInfo.money = Math.round(gameInfo.money);
    const currentTimeISO = new Date().toISOString();
    const activeOrders = await dbAll(
      `SELECT * FROM orders 
       WHERE playerId = ? 
       AND active = 1`,
      [req.session.playerId],
      'Failed to retrieve active orders'
    );

    for (const order of activeOrders) {
      const startTime = new Date(order.startTime);
      const currentTime = new Date();
      const elapsedTime = (currentTime - startTime) / 1000;
      const progress = Math.min((elapsedTime / order.duration) * 100, 100);
      const isShipping = progress < 100;

      if (!isShipping) {
        await OrderCompleted(order.id, req.session.playerId);
      }
    }

    const activeOrderRow = activeOrders.find(order => {
      const startTime = new Date(order.startTime);
      const currentTime = new Date();
      const elapsedTime = (currentTime - startTime) / 1000;
      return elapsedTime < order.duration;
    });

    const { steps: shippingSteps, totalDuration: shippingDuration } = await getShippingSteps(req.session.playerId);
    const startTime = activeOrderRow ? new Date(activeOrderRow.startTime) : null;
    const currentTime = new Date();
    const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;
    const progress = Math.min((elapsedTime / shippingDuration) * 100, 100);
    const isShipping = activeOrderRow ? progress < 100 : false;

    const availableTechnologies = await dbAll(
      'SELECT t.id, t.name, t.description, t.cost, t.gameEffect FROM available_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ?',
      [req.session.playerId],
      'Failed to retrieve available technologies'
    );
    const acquiredTechnologies = await dbAll(
      'SELECT at.*, t.techCode FROM acquired_technologies at JOIN technologies t ON at.techId = t.id WHERE at.playerId = ?',
      [req.session.playerId],
      'Failed to retrieve acquired technologies'
    );

    const productRow = await dbGet(
      'SELECT p.* FROM products p JOIN PlayerProducts pp ON p.id = pp.productId WHERE pp.playerId = ?',
      [req.session.playerId],
      'Failed to retrieve product info'
    );

    const inventory = await dbAll(
      'SELECT * FROM inventory WHERE playerId = ?',
      [req.session.playerId],
      'Failed to retrieve inventory'
    );

    res.json({
      ...gameInfo,
      shippingSteps,
      shippingDuration,
      progress,
      isShipping,
      availableTechnologies,
      acquiredTechnologies,
      product: productRow,
      inventory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/start-shipping', async (req, res) => {
  if (!req.session.playerId) {
    console.log('Unauthorized access to start-shipping');
    return res.status(401).json({ error: 'No player session' });
  }

  try {
    const currentTime = new Date().toISOString();
    const activeOrder = await dbGet(
      `SELECT * FROM orders 
       WHERE playerId = ? 
       AND datetime(startTime, '+' || duration || ' seconds') > datetime(?)`,
      [req.session.playerId, currentTime],
      'Failed to check active orders'
    );

    if (activeOrder) {
      console.log('An active order is still in progress');
      return res.status(400).json({ error: 'An active order is still in progress' });
    }

    const { steps: shippingSteps, totalDuration: baseShippingDuration } = await getShippingSteps(req.session.playerId);
    let shippingDuration = baseShippingDuration; // Use baseShippingDuration
    console.log('Start Shipping - Base Shipping Duration:', baseShippingDuration); // Debugging statement

    const startTime = new Date().toISOString();
    const { shippingCost, salesPrice, distance } = await calculateShippingAndBuyLabel(req.session.playerId);
    await dbRun(
      'INSERT INTO orders (playerId, startTime, duration) VALUES (?, ?, ?)',
      [req.session.playerId, startTime, shippingDuration],
      'Failed to start shipping'
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
      distance // Add distance to the response
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/update-progress', async (req, res) => {
  if (!req.session.playerId) {
    console.log('Unauthorized access to update-progress');
    return res.status(401).json({ error: 'No player session' });
  }
  const { progress } = req.body;
  try {
    await dbRun(
      'UPDATE player SET progress = ? WHERE id = ?',
      [progress, req.session.playerId],
      'Failed to update progress'
    );
    res.json({ message: 'Progress updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchase-technology', async (req, res) => {
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
    await dbRun(
      'INSERT INTO acquired_technologies (playerId, techId, acquiredDate, acquiredCost) VALUES (?, ?, ?, ?)',
      [req.session.playerId, techId, acquiredDate, cost],
      'Failed to purchase technology'
    );
    await dbRun(
      'UPDATE player SET money = money - ? WHERE id = ?',
      [cost, req.session.playerId],
      'Failed to update player money'
    );
    await dbRun(
      'DELETE FROM available_technologies WHERE playerId = ? AND techId = ?',
      [req.session.playerId, techId],
      'Failed to remove technology from available technologies'
    );
    await makeNewTechnologyAvailable(req.session.playerId); // Call the function here
    res.json({ success: true, message: 'Technology purchased successfully.' });
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
